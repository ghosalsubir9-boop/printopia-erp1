/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Stack,
  InputAdornment,
  Tabs,
  Tab,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Assessment as ReportIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Engineering as OperatorIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { JobCard, JobCardStatus, JobCardFilterGroup, JobCardReportData } from '../types';
import { JobCardApiService } from '../services/jobCardApi';

interface JobCardListProps {
  onSelect: (jobCard: JobCard) => void;
  onAdd: () => void;
  currentRole: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'SALES_EXECUTIVE' | 'DESIGNER' | 'PRINTER' | 'ACCOUNTS';
  onRoleChange: (role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'SALES_EXECUTIVE' | 'DESIGNER' | 'PRINTER' | 'ACCOUNTS') => void;
}

const statusColors: Record<JobCardStatus, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
  'Created': 'default',
  'Artwork Ready': 'info',
  'Paper Issued': 'warning',
  'Plate Issued': 'warning',
  'Machine Queue': 'primary',
  'Printing': 'primary',
  'Cutting Pending': 'warning',
  'Cutting In Progress': 'primary',
  'Cutting Completed': 'success',
  'Finishing Pending': 'warning',
  'Finishing In Progress': 'primary',
  'Finishing Completed': 'success',
  'QC Pending': 'warning',
  'QC': 'info',
  'Rework': 'error',
  'Packing': 'warning',
  'Ready for Dispatch': 'success',
  'Partially Dispatched': 'success',
  'Dispatched': 'success',
  'Delivered': 'success',
  'Completed': 'success',
  'Cancelled': 'error'
};

export default function JobCardList({ onSelect, onAdd, currentRole, onRoleChange }: JobCardListProps) {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [filterGroup, setFilterGroup] = useState<JobCardFilterGroup>('All');

  // List tabs: 0 = Active Cards, 1 = Analytical Reports
  const [listTab, setListTab] = useState(0);

  // Reports data state
  const [reportsData, setReportsData] = useState<JobCardReportData | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    loadJobCards();
  }, [searchTerm, statusFilter, filterGroup]);

  useEffect(() => {
    if (listTab === 1) {
      loadReports();
    }
  }, [listTab]);

  const loadJobCards = async () => {
    try {
      setLoading(true);
      const data = await JobCardApiService.getJobCards({
        searchTerm,
        status: statusFilter,
        filterGroup: filterGroup === 'All' ? undefined : filterGroup
      });
      setJobCards(data);
    } catch (err) {
      setError('Failed to fetch job cards.');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      setLoadingReports(true);
      const data = await JobCardApiService.getReportsData();
      setReportsData(data);
    } catch (err) {
      setError('Failed to calculate analytics reports.');
    } finally {
      setLoadingReports(false);
    }
  };

  const handleRoleSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    onRoleChange(e.target.value as 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'SALES_EXECUTIVE' | 'DESIGNER' | 'PRINTER' | 'ACCOUNTS');
  };

  return (
    <Box>
      {/* Upper header panel */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>Job Card Management</Typography>
          <Typography variant="body2" color="text.secondary">Automatically generate and track production instructions from approved orders.</Typography>
        </Box>

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          {/* Interactive Role Switcher */}
          <TextField
            select
            label="Simulated Role"
            size="small"
            value={currentRole}
            onChange={handleRoleSelection}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="SUPER_ADMIN">SUPER_ADMIN (Full Access)</MenuItem>
            <MenuItem value="COMPANY_ADMIN">COMPANY_ADMIN (Full Access)</MenuItem>
            <MenuItem value="SALES_EXECUTIVE">SALES_EXECUTIVE (View Only)</MenuItem>
            <MenuItem value="DESIGNER">DESIGNER (Artwork Only)</MenuItem>
            <MenuItem value="PRINTER">PRINTER (Run Logs & Operations)</MenuItem>
            <MenuItem value="ACCOUNTS">ACCOUNTS (Read Only)</MenuItem>
          </TextField>

          {currentRole !== 'SALES_EXECUTIVE' && currentRole !== 'ACCOUNTS' && currentRole !== 'DESIGNER' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAdd}
              sx={{ fontWeight: 'bold' }}
            >
              Generate Job Card
            </Button>
          )}
        </Stack>
      </Box>

      {/* Main Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={listTab} onChange={(e, val) => setListTab(val)}>
          <Tab label="Active Job Cards" sx={{ fontWeight: 'bold' }} />
          <Tab label="Analytical & Compliance Reports" sx={{ fontWeight: 'bold' }} />
        </Tabs>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* TAB 0: Job Cards Dashboard */}
      {listTab === 0 && (
        <Box>
          {/* Filtering Widgets */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  placeholder="Search Card No, Customer, Product, Machine..."
                  size="small"
                  fullWidth
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }
                  }}
                />
              </Grid>

              <Grid size={{ xs: 6, sm: 4, md: 2.5 }}>
                <TextField
                  select
                  label="Workflow Stage"
                  size="small"
                  fullWidth
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="All">All Stages</MenuItem>
                  <MenuItem value="Created">Created</MenuItem>
                  <MenuItem value="Artwork Ready">Artwork Ready</MenuItem>
                  <MenuItem value="Paper Issued">Paper Issued</MenuItem>
                  <MenuItem value="Plate Issued">Plate Issued</MenuItem>
                  <MenuItem value="Machine Queue">Machine Queue</MenuItem>
                  <MenuItem value="Printing">Printing</MenuItem>
                  <MenuItem value="QC">QC Check</MenuItem>
                  <MenuItem value="Rework">Rework</MenuItem>
                  <MenuItem value="Ready for Dispatch">Ready for Dispatch</MenuItem>
                  <MenuItem value="Dispatched">Dispatched</MenuItem>
                  <MenuItem value="Delivered">Delivered</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 6, sm: 4, md: 2.5 }}>
                <TextField
                  select
                  label="Quick Filter"
                  size="small"
                  fullWidth
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value as JobCardFilterGroup)}
                >
                  <MenuItem value="All">All Jobs</MenuItem>
                  <MenuItem value="Created Today">Created Today</MenuItem>
                  <MenuItem value="Running">Running Jobs</MenuItem>
                  <MenuItem value="QC Pending">QC Pending</MenuItem>
                  <MenuItem value="Dispatch Pending">Dispatch Pending</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Overdue">Overdue Targets</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 4, md: 3 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('All');
                    setFilterGroup('All');
                    loadJobCards();
                  }}
                  variant="outlined"
                  size="small"
                >
                  Reset filters
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Records Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Job Card No</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>PO Reference</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Customer Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Products / Items</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Assigned Machine</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Created Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                      <Typography variant="body2" color="text.secondary">Filtering job cards database...</Typography>
                    </TableCell>
                  </TableRow>
                ) : jobCards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                      <Typography variant="body1" color="text.secondary">No matching job cards found in database.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  jobCards.map((card) => {
                    const productsStr = card.items.map(i => i.productName).join(', ');
                    const machinesStr = card.items.map(i => i.machine).join(', ');
                    return (
                      <TableRow key={card.id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{card.jobCardNumber}</TableCell>
                        <TableCell>{card.poNumber}</TableCell>
                        <TableCell>{card.customerName}</TableCell>
                        <TableCell sx={{ maxWidth: 220, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {productsStr}
                        </TableCell>
                        <TableCell>{machinesStr}</TableCell>
                        <TableCell>{new Date(card.jobCreationDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Chip
                            label={card.status}
                            color={statusColors[card.status]}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={card.priority}
                            color={card.priority === 'Super Urgent' ? 'error' : card.priority === 'Urgent' ? 'warning' : 'primary'}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton onClick={() => onSelect(card)} color="primary" size="small">
                            <ViewIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 1: Analytical Reports */}
      {listTab === 1 && (
        <Box>
          {loadingReports || !reportsData ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">Aggregating real-time reports data...</Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {/* Stat summary cards */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ bgcolor: 'info.light', color: 'black' }}>
                  <CardContent>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>Running Production Jobs</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }}>{reportsData.runningJobs.length}</Typography>
                    <Typography variant="caption">Under processing on press beds</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ bgcolor: 'success.light', color: 'black' }}>
                  <CardContent>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>Completed Jobs (Historic)</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }}>{reportsData.completedJobs.length}</Typography>
                    <Typography variant="caption">Dispatched or delivered to client</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ bgcolor: 'error.light', color: 'black' }}>
                  <CardContent>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>QC Failures & Overdues</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }}>{reportsData.delayReport.length + reportsData.reworkReport.length}</Typography>
                    <Typography variant="caption">Requiring priority supervision</Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Machine-wise distribution */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, borderRadius: 2, h: '100%' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Machine-wise Jobs Load</Typography>
                  {reportsData.machineWise.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No machines workload logged.</Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Machine</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Active Job Cards Count</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reportsData.machineWise.map((item) => (
                            <TableRow key={item.machine}>
                              <TableCell>{item.machine}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Grid>

              {/* Customer-wise distribution */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, borderRadius: 2, h: '100%' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Customer-wise Jobs Load</Typography>
                  {reportsData.customerWise.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No customer data logged.</Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Customer Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Cards</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reportsData.customerWise.map((item) => (
                            <TableRow key={item.customer}>
                              <TableCell>{item.customer}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Grid>

              {/* Operator productivity */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3, borderRadius: 2, h: '100%' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <OperatorIcon color="primary" /> Operator Working Hours
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Operator</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="right">Estimated Hours</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportsData.operatorWise.map((item) => (
                          <TableRow key={item.operator}>
                            <TableCell>{item.operator}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.hours} hrs</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              {/* Delay Report */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3, borderRadius: 2, h: '100%' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                    <WarningIcon /> Overdue Delivery Delays
                  </Typography>
                  {reportsData.delayReport.length === 0 ? (
                    <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'black', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>All Job Cards are on schedule!</Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Card No</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Days Delayed</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reportsData.delayReport.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.number}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main' }}>+{item.delayDays} days</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Grid>

              {/* Rework Report */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3, borderRadius: 2, h: '100%' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'warning.main' }}>
                    QC Rework Logs
                  </Typography>
                  {reportsData.reworkReport.length === 0 ? (
                    <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'black', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>No jobs are currently in rework status.</Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Card No</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Cause / Reason</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reportsData.reworkReport.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell sx={{ fontWeight: 'bold' }}>{item.number}</TableCell>
                              <TableCell sx={{ fontSize: '0.75rem' }}>{item.reason}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
}
