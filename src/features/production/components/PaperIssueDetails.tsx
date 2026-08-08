/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
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
  ArrowBack as BackIcon,
  Print as PrintIcon,
  CheckCircle as ConfirmIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { PaperIssueSlip, PISStatus } from '../types';

interface PaperIssueDetailsProps {
  slip: PaperIssueSlip;
  onBack: () => void;
  onEdit?: (slip: PaperIssueSlip) => void;
}

export default function PaperIssueDetails({ slip, onBack, onEdit }: PaperIssueDetailsProps) {
  const [printMode, setPrintMode] = useState(false);

  const getStatusColor = (status: PISStatus) => {
    switch (status) {
      case 'Draft':
        return 'default';
      case 'Partially Issued':
        return 'warning';
      case 'Fully Issued':
        return 'success';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (printMode) {
    return (
      <Box sx={{ p: 1, bgcolor: 'white', minHeight: '100vh', color: 'black' }}>
        {/* Print controls (hidden during actual printing) */}
        <Box
          className="no-print"
          sx={{
            mb: 4,
            p: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
            Print Preview Mode (optimized for A4/Letter Paper)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="contained"
              color="warning"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
            >
              Print / Save PDF
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<CloseIcon />}
              onClick={() => setPrintMode(false)}
            >
              Exit Preview
            </Button>
          </Box>
        </Box>

        {/* PRINT SLIP FORMAT */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            maxW: '800px',
            mx: 'auto',
            border: '2px solid black',
            borderRadius: 0,
            bgcolor: 'white',
            color: 'black',
            fontFamily: 'serif',
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', letterSpacing: 1, fontFamily: 'serif' }}>
              PRINTOPIA PRESS
            </Typography>
            <Typography variant="subtitle1" sx={{ fontStyle: 'italic', color: 'grey.700' }}>
              Industrial Printing & Packaging Solutions ERP
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 2, textDecoration: 'underline' }}>
              PAPER ISSUE SLIP
            </Typography>
          </Box>

          <Divider sx={{ borderBottomWidth: 2, borderColor: 'black', mb: 3 }} />

          {/* Metadata Grid */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body1">
                <strong>Issue Number:</strong> {slip.issueNumber}
              </Typography>
              <Typography variant="body1">
                <strong>Issue Date:</strong> {slip.issueDate}
              </Typography>
              <Typography variant="body1">
                <strong>PO Number:</strong> {slip.poNumber}
              </Typography>
              <Typography variant="body1">
                <strong>Customer Name:</strong> {slip.customerName}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }} sx={{ textAlign: 'right' }}>
              <Typography variant="body1">
                <strong>Delivery Date:</strong> {slip.deliveryDate}
              </Typography>
              <Typography variant="body1">
                <strong>Job Item:</strong> Job-{String(slip.jobItemIndex).padStart(2, '0')}
              </Typography>
              <Typography variant="body1">
                <strong>Status:</strong> {slip.status}
              </Typography>
            </Grid>
          </Grid>

          {/* Job details */}
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, borderBottom: '1px solid black' }}>
            Job & Product Details
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="body1">
                <strong>Product Description:</strong> {slip.productName}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Typography variant="body1">
                <strong>Paper Stock:</strong> {slip.paperType}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Typography variant="body1">
                <strong>Weight (GSM):</strong> {slip.gsm} GSM
              </Typography>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Typography variant="body1">
                <strong>Parent Size:</strong> {slip.parentSheetSize}
              </Typography>
            </Grid>
          </Grid>

          {/* Quantity table */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 0, borderColor: 'black', mb: 4 }}>
            <Table sx={{ '& .MuiTableCell-root': { borderColor: 'black', color: 'black' } }}>
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Quantity Category</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Sheets (Qty)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Required Parent Sheets (including planning wastage)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                    {slip.requiredParentSheets.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Previously Issued Sheets</TableCell>
                  <TableCell align="right">{slip.previouslyIssuedSheets.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>CURRENT ISSUE QUANTITY</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {slip.currentIssueQuantity.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Total Cumulative Issued</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {slip.totalIssuedSheets.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Remaining Balance Sheets</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {slip.balanceSheets.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Logistical remarks */}
          {slip.remarks && (
            <Box sx={{ mb: 4, p: 2, border: '1px solid black' }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                Special Remarks / Cutting Instructions:
              </Typography>
              <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                {slip.remarks}
              </Typography>
            </Box>
          )}

          {/* Signature fields */}
          <Box sx={{ mt: 8, display: 'flex', justifyContent: 'space-between' }}>
            <Box sx={{ textAlign: 'center', width: '200px' }}>
              <Divider sx={{ borderColor: 'black', mb: 1 }} />
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                Issued By
              </Typography>
              <Typography variant="body2" color="grey.800">
                ({slip.issuedBy})
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', width: '200px' }}>
              <Divider sx={{ borderColor: 'black', mb: 1 }} />
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                Received By (Cutter/Floor)
              </Typography>
              <Typography variant="body2" color="grey.800">
                ({slip.receivedBy})
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', width: '200px' }}>
              <Divider sx={{ borderColor: 'black', mb: 1 }} />
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                Authorized Manager
              </Typography>
              <Typography variant="body2" color="grey.800">
                Sign / Seal
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Global style for hiding print headers/footers in CSS */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              background-color: white !important;
              color: black !important;
            }
          }
        `}} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header and Control Row */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <IconButton onClick={onBack} size="small">
            <BackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Paper Issue Slip Details: {slip.issueNumber}
          </Typography>
          <Chip label={slip.status} color={getStatusColor(slip.status)} size="small" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {slip.status !== 'Cancelled' && onEdit && (
            <Button variant="outlined" color="inherit" onClick={() => onEdit(slip)}>
              Edit Slip
            </Button>
          )}
          <Button
            variant="contained"
            color="warning"
            startIcon={<PrintIcon />}
            onClick={() => setPrintMode(true)}
          >
            Print Slip
          </Button>
        </Box>
      </Box>

      {/* Main Details Grid */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Slip card */}
          <Card sx={{ borderRadius: 2, mb: 3 }}>
            <Box sx={{ p: 2, bgcolor: 'grey.800', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Slip Information
              </Typography>
              <Typography variant="subtitle1">
                Date: {slip.issueDate}
              </Typography>
            </Box>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Production Order</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{slip.poNumber}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Customer</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{slip.customerName}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Job Item</Typography>
                  <Typography variant="body1">
                    Job-{String(slip.jobItemIndex).padStart(2, '0')}: {slip.productName}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Target Delivery Date</Typography>
                  <Typography variant="body1">{slip.deliveryDate}</Typography>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Paper Material Type</Typography>
                  <Typography variant="body1">{slip.paperType}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Paper GSM Weight</Typography>
                  <Typography variant="body1">{slip.gsm} GSM</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Parent Sheet Size</Typography>
                  <Typography variant="body1">{slip.parentSheetSize}</Typography>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Issued By (Warehouse)</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{slip.issuedBy}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Received By (Production Floor)</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{slip.receivedBy}</Typography>
                </Grid>

                {slip.remarks && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary">Remarks / Cutting Specs</Typography>
                    <Typography variant="body1" sx={{ fontStyle: 'italic', bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
                      {slip.remarks}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Status / History & Formulas Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 2 }}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Ledger Quantities
              </Typography>
            </Box>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Required Parent Sheets</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {slip.requiredParentSheets.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Previously Issued Sheets</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                    {slip.previouslyIssuedSheets.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'primary.50', borderRadius: 1.5 }}>
                  <Typography variant="caption" color="primary">CURRENT ISSUE QUANTITY</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {slip.currentIssueQuantity.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total Issued Sheets (Formula: Prev + Current)</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {slip.totalIssuedSheets.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">Balance Sheets (Formula: Req - Total)</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: slip.balanceSheets > 0 ? 'warning.main' : 'success.main' }}>
                    {slip.balanceSheets.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
