/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper as MuiPaper,
  TextField,
  MenuItem,
  IconButton,
  Button,
  Chip,
  Tooltip,
  Collapse,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  InputAdornment,
  Divider,
  Stack
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  KeyboardArrowDown as DownIcon,
  KeyboardArrowUp as UpIcon,
  CalendarToday as DateIcon,
  Person as PersonIcon,
  LocalPrintshop as PrintIcon,
  MenuBook as PaperIcon,
  PrecisionManufacturing as MachineIcon,
  AutoAwesome as AutoIcon,
  InfoOutlined as InfoIcon,
  PriorityHigh as PriorityIcon
} from '@mui/icons-material';

import { 
  FileText as QuotationIcon
} from 'lucide-react';

import { EstimateJob } from '../types';
import { EstimateApiService } from '../services/api';
import { CustomerMasterService } from '../../../customer-master/services/mockApi';
import { CustomerMasterItem } from '../../../customer-master/types';
import { QuotationIntegrationService } from '../../../quotation/services/integration';

interface EstimateListProps {
  onAddEstimate: () => void;
  onEditEstimate: (job: EstimateJob) => void;
  onDeleteEstimate: (id: string) => Promise<void>;
  onConvertToQuotation?: (data: any) => void;
  jobs: EstimateJob[];
  loading?: boolean;
}

// Row subcomponent supporting expandable detail drawer
function EstimateRow({ row, onEdit, onDelete, onConvertToQuotation }: { 
  row: EstimateJob; 
  onEdit: () => void; 
  onDelete: () => void;
  onConvertToQuotation?: (data: any) => void;
}) {
  const [open, setOpen] = useState(false);

  // Helper for priority styling
  const getPriorityProps = (p: string) => {
    switch (p) {
      case 'Urgent':
        return { color: 'warning' as const, label: 'Urgent', bg: 'rgba(217, 119, 6, 0.12)' };
      case 'Very Urgent':
        return { color: 'error' as const, label: 'Very Urgent', bg: 'rgba(220, 38, 38, 0.12)' };
      default:
        return { color: 'default' as const, label: 'Normal', bg: 'rgba(148, 163, 184, 0.12)' };
    }
  };

  const pri = getPriorityProps(row.priority);

  return (
    <React.Fragment>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell sx={{ width: 50 }}>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <UpIcon /> : <DownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          {row.estimateNumber}
        </TableCell>
        <TableCell>{new Date(row.estimateDate).toLocaleDateString()}</TableCell>
        <TableCell sx={{ fontWeight: 'bold' }}>{row.customerName}</TableCell>
        <TableCell>{row.productName}</TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {row.orderQuantity.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            + {row.extraQuantity.toLocaleString()} sp.
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={pri.label}
            color={pri.color}
            size="small"
            sx={{
              fontWeight: 800,
              fontSize: '0.65rem',
              height: 20,
              bgcolor: pri.bg
            }}
          />
        </TableCell>
        <TableCell>{row.salesExecutive || '--'}</TableCell>
        <TableCell align="right">
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            {onConvertToQuotation && (
              <Tooltip title="Create Quotation from Estimate">
                <IconButton 
                  size="small" 
                  color="secondary" 
                  onClick={() => {
                    const quotationData = QuotationIntegrationService.convertEstimateToQuotation(row as any);
                    onConvertToQuotation(quotationData);
                  }}
                >
                  <QuotationIcon size={18} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Edit Job Entry">
              <IconButton size="small" color="primary" onClick={onEdit}>
                <EditIcon sx={{ fontSize: '1.2rem' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Job Entry">
              <IconButton size="small" color="error" onClick={onDelete}>
                <DeleteIcon sx={{ fontSize: '1.2rem' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>

      {/* Expanded detail drawer */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 3, px: 2, bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
                <InfoIcon color="primary" sx={{ fontSize: '1.2rem' }} /> Job Engineering Specifications
              </Typography>

              <Grid container spacing={3}>
                {/* Physical Sizes */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <MuiPaper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
                      Dimensions ({row.sizeUnit})
                    </Typography>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Finished size:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{row.finishedWidth} × {row.finishedHeight}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Close size:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{row.closeWidth ? `${row.closeWidth} × ${row.closeHeight}` : 'Same'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Open layout size:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{row.openWidth ? `${row.openWidth} × ${row.openHeight}` : 'Same'}</Typography>
                      </Box>
                    </Stack>
                  </MuiPaper>
                </Grid>

                {/* Printing & Press Specifications */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <MuiPaper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
                      Printing & Colors
                    </Typography>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Print Run Type:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{row.printingType}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Color Stations:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          F: {row.frontColor} / B: {row.backColor}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Layout Process:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{row.printingProcess}</Typography>
                      </Box>
                    </Stack>
                  </MuiPaper>
                </Grid>

                {/* Paper Specifications */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <MuiPaper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
                      Paper Stock Specs
                    </Typography>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Category:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{row.paperCategoryName}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Paper Type:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
                          {row.paperName}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">GSM / Sheet Size:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {row.gsmValue} GSM ({row.parentSheetName})
                        </Typography>
                      </Box>
                    </Stack>
                  </MuiPaper>
                </Grid>

                {/* Machine Selection & Finishing */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <MuiPaper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
                      Machine allocation
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <MachineIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {row.machineName}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      icon={row.machineSelectionMode === 'Auto' ? <AutoIcon sx={{ fontSize: '0.8rem' }} /> : undefined}
                      label={row.machineSelectionMode === 'Auto' ? 'Smart Auto Recommended' : 'Manual Lock-in'}
                      color={row.machineSelectionMode === 'Auto' ? 'primary' : 'secondary'}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }}
                    />
                  </MuiPaper>
                </Grid>

                {/* Finishing */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <MuiPaper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                      Finishing specs ({row.finishingItems?.length || row.finishingOptions.length})
                    </Typography>
                    {row.finishingItems && row.finishingItems.length > 0 ? (
                      <TableContainer component={Box} sx={{ mt: 1 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ '& th': { fontSize: '0.65rem', fontWeight: 800, p: 0.5, borderBottom: '1px solid' } }}>
                              <TableCell>Process</TableCell>
                              <TableCell align="right">Qty</TableCell>
                              <TableCell align="right">Rate</TableCell>
                              <TableCell align="right">Total</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {row.finishingItems.map((f, i) => (
                              <TableRow key={i} sx={{ '& td': { fontSize: '0.7rem', p: 0.5, borderBottom: 'none' } }}>
                                <TableCell sx={{ fontWeight: 600 }}>{f.name}</TableCell>
                                <TableCell align="right">{f.quantity.toLocaleString()}</TableCell>
                                <TableCell align="right">₹ {f.rate}</TableCell>
                                <TableCell align="right">₹ {f.total.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : row.finishingOptions.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {row.finishingOptions.map((f) => (
                          <Chip
                            key={f}
                            label={f}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700 }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No special post-press finishing configured.
                      </Typography>
                    )}
                  </MuiPaper>
                </Grid>

                {/* Engineering Remarks */}
                {row.remarks && (
                  <Grid size={{ xs: 12 }}>
                    <MuiPaper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.disabledBackground' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                        Special instructions / remarks
                      </Typography>
                      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                        "{row.remarks}"
                      </Typography>
                    </MuiPaper>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

export default function EstimateList({ onAddEstimate, onEditEstimate, onDeleteEstimate, onConvertToQuotation, jobs, loading = false }: EstimateListProps) {
  // --- FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  
  // Loaded customers for filtering
  const [customers, setCustomers] = useState<CustomerMasterItem[]>([]);

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const list = CustomerMasterService.getCustomers();
    setCustomers(list);
  }, []);

  // Filtered Jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.estimateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.salesExecutive && job.salesExecutive.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCustomer = customerFilter === 'All' || job.customerId === customerFilter;
    const matchesPriority = priorityFilter === 'All' || job.priority === priorityFilter;

    return matchesSearch && matchesCustomer && matchesPriority;
  });

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await onDeleteEstimate(deleteId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <Box>
      {/* Search & Filtering Block */}
      <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            {/* Search */}
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search estimate code, customer, product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Grid>

            {/* Customer Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Customer Filter"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
              >
                <MenuItem value="All">All Customers</MenuItem>
                {customers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.companyName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Priority Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Priority Filter"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <MenuItem value="All">All Priorities</MenuItem>
                <MenuItem value="Normal">Normal</MenuItem>
                <MenuItem value="Urgent">Urgent</MenuItem>
                <MenuItem value="Very Urgent">Very Urgent</MenuItem>
              </TextField>
            </Grid>

            {/* Add Action Button */}
            <Grid size={{ xs: 12, md: 2 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={onAddEstimate}
                sx={{ borderRadius: '8px', fontWeight: 'bold', textTransform: 'none', py: 0.9 }}
              >
                Create Estimate
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main ERP Estimates Table */}
      <TableContainer component={MuiPaper} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Table aria-label="collapsible table">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ width: 50 }} />
              <TableCell sx={{ fontWeight: 'bold' }}>Estimate Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Customer Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Product Template</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Qty (Order + Sp.)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Executive</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', pr: 3 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Retrieving Estimate Registry specs...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredJobs.length > 0 ? (
              filteredJobs.map((row) => (
                <EstimateRow
                  key={row.id}
                  row={row}
                  onEdit={() => onEditEstimate(row)}
                  onDelete={() => setDeleteId(row.id)}
                  onConvertToQuotation={onConvertToQuotation}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                    No Job Estimates Registered
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                    Try adjustments to your search terms or click "Create Estimate" to configure a new job.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        sx={{ '& .MuiPaper-root': { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PriorityIcon color="error" /> Delete Estimate Spec
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this job entry card? This will remove all associated engineering specs, dimensional metrics, and paper linkages from the local estimate database. This action is irreversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={() => setDeleteId(null)} disabled={isDeleting}>
            Keep Specification
          </Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
