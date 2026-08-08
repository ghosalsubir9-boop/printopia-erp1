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
import { PlateIssueSlip, PLSStatus } from '../types';

interface PlateIssueDetailsProps {
  slip: PlateIssueSlip;
  onBack: () => void;
  onEdit?: (slip: PlateIssueSlip) => void;
}

export default function PlateIssueDetails({ slip, onBack, onEdit }: PlateIssueDetailsProps) {
  const [printMode, setPrintMode] = useState(false);

  const getStatusColor = (status: PLSStatus) => {
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
              PLATE ISSUE SLIP
            </Typography>
          </Box>

          <Divider sx={{ borderBottomWidth: 2, borderColor: 'black', mb: 3 }} />

          {/* Metadata Grid */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body1">
                <strong>Plate Issue Number:</strong> {slip.issueNumber}
              </Typography>
              <Typography variant="body1">
                <strong>Issue Date:</strong> {slip.issueDate}
              </Typography>
              <Typography variant="body1">
                <strong>Production Order No:</strong> {slip.poNumber}
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
                <strong>Machine:</strong> {slip.machineName}
              </Typography>
              <Typography variant="body1">
                <strong>Plate Size:</strong> {slip.plateSize}
              </Typography>
              <Typography variant="body1">
                <strong>Printing Side:</strong> {slip.printingSide}
              </Typography>
            </Grid>
          </Grid>

          {/* Product and Job Table */}
          <TableContainer component={Box} sx={{ mb: 4, border: '1px solid black' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'grey.200' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', borderBottom: '1px solid black', borderRight: '1px solid black', color: 'black' }}>
                    Job No & Product Name
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', borderBottom: '1px solid black', borderRight: '1px solid black', color: 'black' }}>
                    Plate Method
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', borderBottom: '1px solid black', borderRight: '1px solid black', color: 'black' }}>
                    Required Qty
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', borderBottom: '1px solid black', borderRight: '1px solid black', color: 'black' }}>
                    Prev. Issued
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', borderBottom: '1px solid black', borderRight: '1px solid black', color: 'black' }}>
                    Current Issue
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', borderBottom: '1px solid black', color: 'black' }}>
                    Balance Qty
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ borderBottom: 'none', borderRight: '1px solid black', color: 'black' }}>
                    <strong>Job-{String(slip.jobItemIndex).padStart(2, '0')}</strong>: {slip.productName}
                  </TableCell>
                  <TableCell sx={{ borderBottom: 'none', borderRight: '1px solid black', color: 'black' }}>
                    {slip.plateMethod}
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: 'none', borderRight: '1px solid black', color: 'black' }}>
                    {slip.requiredPlateQuantity.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: 'none', borderRight: '1px solid black', color: 'black' }}>
                    {slip.previouslyIssuedPlates.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', borderBottom: 'none', borderRight: '1px solid black', color: 'black' }}>
                    {slip.currentIssueQuantity.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', borderBottom: 'none', color: 'black' }}>
                    {slip.balancePlates.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Remarks */}
          {slip.remarks && (
            <Box sx={{ mb: 6, p: 2, border: '1px dashed black' }}>
              <Typography variant="body1">
                <strong>Remarks / Special Instructions:</strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                {slip.remarks}
              </Typography>
            </Box>
          )}

          {/* Signature fields */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 8, px: 2 }}>
            <Box sx={{ textAlign: 'center', width: '200px' }}>
              <Divider sx={{ borderColor: 'black', mb: 1 }} />
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                Issued By (Platemaking)
              </Typography>
              <Typography variant="body2" color="grey.800">
                ({slip.issuedBy})
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', width: '200px' }}>
              <Divider sx={{ borderColor: 'black', mb: 1 }} />
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                Received By (Machine Operator)
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
            Plate Issue Slip Details: {slip.issueNumber}
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
                  <Typography variant="body1">{slip.deliveryDate || 'N/A'}</Typography>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Selected Machine</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{slip.machineName}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Machine Plate Size</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{slip.plateSize || 'N/A'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Printing Side</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{slip.printingSide}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Plate Method</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{slip.plateMethod}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Remarks/History section */}
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 'bold' }}>
                Remarks & Operations Notes
              </Typography>
              <Typography variant="body2" sx={{ fontStyle: slip.remarks ? 'normal' : 'italic', color: slip.remarks ? 'text.primary' : 'text.secondary' }}>
                {slip.remarks || 'No remarks provided for this plate issue.'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 2, mb: 3 }}>
            <Box sx={{ p: 2, bgcolor: 'warning.main', color: 'warning.contrastText' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Plate Issue Quantity Check
              </Typography>
            </Box>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                <Typography variant="body2" color="text.secondary">Required Quantity:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{slip.requiredPlateQuantity} plates</Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                <Typography variant="body2" color="text.secondary">Previously Issued:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{slip.previouslyIssuedPlates} plates</Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1, bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Current Issue:</Typography>
                <Typography variant="body1" color="primary.main" sx={{ fontWeight: 'bold' }}>{slip.currentIssueQuantity} plates</Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                <Typography variant="body2" color="text.secondary">Total Issued Plates:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{slip.totalIssuedPlates} plates</Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Balance Plates:</Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 'bold',
                    color: slip.balancePlates < 0 ? 'error.main' : slip.balancePlates > 0 ? 'warning.main' : 'success.main',
                  }}
                >
                  {slip.balancePlates} plates
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Issuer/Receiver Signatures Info */}
          <Card sx={{ borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                Handover Information
              </Typography>
              <Box>
                <Typography variant="caption" color="text.secondary">Issued By (Platemaker):</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{slip.issuedBy}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Received By (Operator):</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{slip.receivedBy}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
