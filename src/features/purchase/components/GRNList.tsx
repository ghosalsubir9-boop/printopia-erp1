/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Typography,
  Box,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
  Stack
} from '@mui/material';
import {
  Search as SearchIcon,
  Eye as ViewIcon,
  Printer as PrintIcon,
  Edit2 as EditIcon,
  Trash2 as TrashIcon,
  ClipboardCheck as ChecklistIcon
} from 'lucide-react';
import { GoodsReceiptNote } from '../types';
import { PurchaseApiService } from '../services/api';

interface GRNListProps {
  onEditGRN: (grn: GoodsReceiptNote) => void;
}

export default function GRNList({ onEditGRN }: GRNListProps) {
  const [grns, setGrns] = useState<GoodsReceiptNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // View details modal
  const [selectedGRN, setSelectedGRN] = useState<GoodsReceiptNote | null>(null);
  const [openDetailsModal, setOpenDetailsModal] = useState(false);

  // Print modal
  const [printGRN, setPrintGRN] = useState<GoodsReceiptNote | null>(null);
  const [openPrintModal, setOpenPrintModal] = useState(false);

  useEffect(() => {
    loadGRNs();
  }, []);

  const loadGRNs = async () => {
    setLoading(true);
    try {
      const fetched = await PurchaseApiService.getGRNs({ searchTerm });
      setGrns(fetched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySearch = () => {
    loadGRNs();
  };

  const handleResetSearch = () => {
    setSearchTerm('');
    setTimeout(() => {
      loadGRNs();
    }, 50);
  };

  const handleOpenDetails = (grn: GoodsReceiptNote) => {
    setSelectedGRN(grn);
    setOpenDetailsModal(true);
  };

  const handleOpenPrint = (grn: GoodsReceiptNote) => {
    setPrintGRN(grn);
    setOpenPrintModal(true);
  };

  const handleDeleteGRN = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this Draft Goods Receipt Note?')) {
      try {
        await PurchaseApiService.deleteGRN(id);
        loadGRNs();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error deleting GRN');
      }
    }
  };

  const handlePrintAction = () => {
    const printContent = document.getElementById('printable-grn-area');
    if (!printContent) return;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // reload to restore React state cleanly
  };

  return (
    <Box>
      {/* Search Bar */}
      <Card sx={{ mb: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Search Goods Receipt Notes"
                placeholder="GRN No., PO No., Vendor, Invoice No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplySearch()}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon size={16} className="text-slate-400" />
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={handleApplySearch} size="small" color="secondary">
                Search
              </Button>
              <Button variant="outlined" color="inherit" onClick={handleResetSearch} size="small">
                Reset
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Grid Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', overflow: 'hidden' }}>
        <Table sx={{ minWidth: 700 }} size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>GRN Number</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Receipt Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>PO Reference</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Vendor Code & Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Invoice Ref</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Warehouse</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', pr: 2 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Loading Goods Receipt registries...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : grns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No registered Goods Receipt Notes found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              grns.map((grn) => (
                <TableRow key={grn.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 'bold', color: 'secondary.main', py: 1.5 }}>
                    {grn.grnNumber}
                  </TableCell>
                  <TableCell>
                    {new Date(grn.grnDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    {grn.poNumber}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.825rem' }}>
                      {grn.vendorName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {grn.vendorCode}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'semibold', fontSize: '0.8rem' }}>
                      {grn.invoiceNumber}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Date: {new Date(grn.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{grn.warehouse}</span>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={grn.status || 'Received'}
                      color={grn.status === 'Draft' ? 'warning' : 'success'}
                      sx={{ fontWeight: 'bold', fontSize: '0.725rem' }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ pr: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title="View Receipt Details">
                        <IconButton size="small" onClick={() => handleOpenDetails(grn)} color="primary">
                          <ViewIcon size={16} />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Print Goods Receipt Document">
                        <IconButton size="small" onClick={() => handleOpenPrint(grn)} color="secondary">
                          <PrintIcon size={16} />
                        </IconButton>
                      </Tooltip>

                      {grn.status === 'Draft' && (
                        <>
                          <Tooltip title="Edit Draft Receipt">
                            <IconButton size="small" onClick={() => onEditGRN(grn)} color="info">
                              <EditIcon size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Draft Receipt">
                            <IconButton size="small" onClick={() => handleDeleteGRN(grn.id)} color="error">
                              <TrashIcon size={16} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* DETAILS VIEW DIALOG */}
      <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>
          <ChecklistIcon className="text-purple-600" size={20} />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Goods Receipt Note (GRN) Details
          </Typography>
        </DialogTitle>
        {selectedGRN && (
          <DialogContent sx={{ p: 4 }}>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                  GRN Details
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                  GRN Number: <span style={{ color: '#8b5cf6' }}>{selectedGRN.grnNumber}</span>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Receipt Date: {new Date(selectedGRN.grnDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  PO Reference: <strong>{selectedGRN.poNumber}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Warehouse Location: <strong>{selectedGRN.warehouse}</strong>
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Supplier Invoice & Transport
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                  Invoice No: {selectedGRN.invoiceNumber}
                </Typography>
                {selectedGRN.challanNumber && (
                  <Typography variant="body2" color="text.secondary">
                    Challan No: {selectedGRN.challanNumber}
                  </Typography>
                )}
                {selectedGRN.transportName && (
                  <Typography variant="body2" color="text.secondary">
                    Transport: {selectedGRN.transportName} ({selectedGRN.vehicleNumber || 'N/A'})
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  Received By: {selectedGRN.receivedBy}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Vendor Information
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                  {selectedGRN.vendorName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Vendor Code: {selectedGRN.vendorCode}
                </Typography>
              </Grid>
            </Grid>

            {/* Received Items Breakdown */}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, display: 'block' }}>
              Materials Received Breakdown
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden', mb: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: '5%' }}>Sr.</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Material Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '35%' }}>Material Description</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', width: '15%' }}>Received Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', width: '15%' }}>Rejected Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', width: '15%' }}>Accepted Qty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedGRN.items.map((it, idx) => (
                    <TableRow key={it.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <span style={{
                          backgroundColor: '#f3e8ff',
                          color: '#6b21a8',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {it.materialType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{it.item}</Typography>
                        {it.itemId && selectedGRN.status !== 'Draft' && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Master Code: {it.itemId} (Stock updated)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {it.receivingQuantity} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{it.unit}</span>
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        {it.rejectedQuantity || 0} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{it.unit}</span>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {it.acceptedQuantity} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{it.unit}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Overall Remarks */}
            <Box sx={{ p: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                General Handover Remarks
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.825rem' }}>
                {selectedGRN.remarks || 'No specific remarks entered.'}
              </Typography>
            </Box>
          </DialogContent>
        )}
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button variant="contained" color="secondary" onClick={() => setOpenDetailsModal(false)} size="small">
            Verify & Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* PRINT DIALOG OVERLAY (Beautiful Printable Paper Layout) */}
      <Dialog open={openPrintModal} onClose={() => setOpenPrintModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Print Goods Receipt Note (GRN)</Typography>
          <Button variant="contained" color="secondary" startIcon={<PrintIcon size={16} />} onClick={handlePrintAction} size="small">
            Execute Print / PDF
          </Button>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {/* Print Template Body */}
          <Box id="printable-grn-area" sx={{ p: 4, bgcolor: '#ffffff', color: '#000000', fontFamily: 'serif' }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', m: 0 }}>
                PRINTOPIA PRESS & PACKAGING LTD.
              </Typography>
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#555' }}>
                Industrial Focal Point, Phase VII, Printopia Tower, IN
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', border: '2px solid #000', px: 2, py: 0.5, display: 'inline-block', mt: 1.5 }}>
                GOODS RECEIPT NOTE (GRN)
              </Typography>
            </Box>

            {printGRN && (
              <>
                <Divider sx={{ borderColor: '#000000', borderWidth: '1px', mb: 2 }} />

                {/* Info Block */}
                <Grid container spacing={2} sx={{ mb: 3, fontSize: '0.9rem' }}>
                  <Grid size={{ xs: 6 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 'bold', width: '35%', padding: '3px 0' }}>GRN Number:</td>
                          <td style={{ padding: '3px 0' }}>{printGRN.grnNumber}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', padding: '3px 0' }}>GRN Date:</td>
                          <td style={{ padding: '3px 0' }}>{new Date(printGRN.grnDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', padding: '3px 0' }}>Ref PO No:</td>
                          <td style={{ padding: '3px 0' }}>{printGRN.poNumber}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', padding: '3px 0' }}>Warehouse:</td>
                          <td style={{ padding: '3px 0' }}>{printGRN.warehouse}</td>
                        </tr>
                      </tbody>
                    </table>
                  </Grid>
                  <Grid size={{ xs: 6 }} sx={{ borderLeft: '1px dashed #aaa', pl: 2 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 'bold', width: '35%', padding: '3px 0' }}>Vendor Name:</td>
                          <td style={{ padding: '3px 0' }}>{printGRN.vendorName} ({printGRN.vendorCode})</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', padding: '3px 0' }}>Invoice No:</td>
                          <td style={{ padding: '3px 0' }}>{printGRN.invoiceNumber} (Dated: {new Date(printGRN.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', padding: '3px 0' }}>Challan No:</td>
                          <td style={{ padding: '3px 0' }}>{printGRN.challanNumber || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', padding: '3px 0' }}>Logistics Ref:</td>
                          <td style={{ padding: '3px 0' }}>{printGRN.transportName ? `${printGRN.transportName} / ${printGRN.vehicleNumber || 'N/A'}` : 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </Grid>
                </Grid>

                {/* Items Table */}
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: '1.5px solid #000', pb: 0.5, mb: 1, textTransform: 'uppercase', fontSize: '0.95rem' }}>
                  Material Ledger Details
                </Typography>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '25px', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                      <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', fontWeight: 'bold' }}>Sr.</th>
                      <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', fontWeight: 'bold' }}>Type</th>
                      <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', fontWeight: 'bold' }}>Material Description</th>
                      <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>Received Qty</th>
                      <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>Rejected Qty</th>
                      <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>Accepted Qty</th>
                      <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', fontWeight: 'bold' }}>Remarks / Inspection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printGRN.items.map((it, idx) => (
                      <tr key={it.id}>
                        <td style={{ border: '1px solid #000', padding: '6px' }}>{idx + 1}</td>
                        <td style={{ border: '1px solid #000', padding: '6px' }}>{it.materialType}</td>
                        <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold' }}>{it.item}</td>
                        <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{it.receivingQuantity} {it.unit}</td>
                        <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', color: '#c2410c' }}>{it.rejectedQuantity || 0} {it.unit}</td>
                        <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{it.acceptedQuantity} {it.unit}</td>
                        <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.8rem', fontStyle: 'italic' }}>{it.remarks || 'Pass'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Handover comments */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '40px', fontSize: '0.85rem' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '20%', fontWeight: 'bold', padding: '6px', border: '1px solid #000', backgroundColor: '#f9f9f9' }}>Overall Comments:</td>
                      <td style={{ padding: '6px', border: '1px solid #000' }}>{printGRN.remarks || 'No issues or discrepancies reported. Materials received and transferred to stock.'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '6px', border: '1px solid #000', backgroundColor: '#f9f9f9' }}>Gate Security Sign:</td>
                      <td style={{ padding: '6px', border: '1px solid #000' }}>Verified at Main Gate Entry. Passed.</td>
                    </tr>
                  </tbody>
                </table>

                {/* Signatures */}
                <Grid container spacing={4} sx={{ mt: 5, textAlign: 'center', fontSize: '0.9rem' }}>
                  <Grid size={{ xs: 4 }}>
                    <Box sx={{ borderTop: '1.5px solid #000', pt: 1, mx: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Received By / Store Keeper</Typography>
                      <Typography variant="caption" color="text.secondary">({printGRN.receivedBy})</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Box sx={{ borderTop: '1.5px solid #000', pt: 1, mx: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Vendor / Carrier Signature</Typography>
                      <Typography variant="caption" color="text.secondary">(Driver Verification)</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Box sx={{ borderTop: '1.5px solid #000', pt: 1, mx: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Authorized QA Inspector</Typography>
                      <Typography variant="caption" color="text.secondary">(Quality stamp)</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
          <Button variant="outlined" color="inherit" onClick={() => setOpenPrintModal(false)} size="small">
            Close Preview
          </Button>
          <Button variant="contained" color="secondary" onClick={handlePrintAction} size="small">
            Confirm & Print
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
