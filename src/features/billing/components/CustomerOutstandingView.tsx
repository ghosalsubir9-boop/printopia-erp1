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
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  InputAdornment,
  Divider
} from '@mui/material';
import { 
  Search, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  Calendar, 
  DollarSign, 
  Filter,
  BarChart2
} from 'lucide-react';
import { CustomerOutstanding, AgeingBucketSummary } from '../types';
import { BillingApiService } from '../api';

export default function CustomerOutstandingView() {
  const [outstandings, setOutstandings] = useState<CustomerOutstanding[]>([]);
  const [summary, setSummary] = useState<AgeingBucketSummary | null>(null);
  
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');

  useEffect(() => {
    loadOutstandingData();
  }, []);

  const loadOutstandingData = async () => {
    const list = await BillingApiService.getCustomerOutstanding();
    setOutstandings(list);

    const sum = await BillingApiService.getAgeingSummary();
    setSummary(sum);
  };

  const uniqueCustomers = Array.from(new Set(outstandings.map(o => o.customerName)));

  // Filter outstandings
  const filteredOutstandings = outstandings.filter(out => {
    if (out.balanceDue <= 0) return false; // only show active outstandings

    const matchesSearch = 
      out.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      out.customerName.toLowerCase().includes(search.toLowerCase());

    const matchesCustomer = customerFilter === 'ALL' || out.customerName === customerFilter;

    return matchesSearch && matchesCustomer;
  });

  const getAgeingDaysColor = (days: number) => {
    if (days <= 0) return 'success.main';
    if (days <= 30) return 'warning.main';
    if (days <= 60) return 'orange';
    if (days <= 90) return 'error.light';
    return 'error.main';
  };

  return (
    <Box>
      {/* Header Panel */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', tracking: '-0.5px' }}>
          Customer Outstandings & Ageing Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Analyze customer credit profiles, ageing buckets, and pending invoices across 30, 60, 90+ days intervals.
        </Typography>
      </Box>

      {/* Ageing Buckets Summary Board */}
      {summary && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary', mb: 1.5 }}>
            AR Ageing Buckets Summary (Outstanding Balances)
          </Typography>
          <Grid container spacing={2.5}>
            {/* Total Outstanding */}
            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <Card variant="outlined" sx={{ borderRadius: '12px', bgcolor: 'rgba(25, 118, 210, 0.02)', borderColor: 'primary.light' }}>
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>TOTAL AR DUE</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main', fontFamily: 'monospace' }}>
                    ₹{summary.totalOutstanding.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Current (0 days) */}
            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <Card variant="outlined" sx={{ borderRadius: '12px', borderLeft: '4px solid', borderLeftColor: 'success.main' }}>
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>CURRENT (NOT DUE)</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main', fontFamily: 'monospace' }}>
                    ₹{summary.current.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 1 - 30 Days */}
            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <Card variant="outlined" sx={{ borderRadius: '12px', borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>1 - 30 DAYS OVERDUE</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: 'warning.main', fontFamily: 'monospace' }}>
                    ₹{summary.bucket1_30.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 31 - 60 Days */}
            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <Card variant="outlined" sx={{ borderRadius: '12px', borderLeft: '4px solid', borderLeftColor: 'orange' }}>
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>31 - 60 DAYS OVERDUE</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: 'orange', fontFamily: 'monospace' }}>
                    ₹{summary.bucket31_60.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 61 - 90 Days */}
            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <Card variant="outlined" sx={{ borderRadius: '12px', borderLeft: '4px solid', borderLeftColor: 'error.light' }}>
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>61 - 90 DAYS OVERDUE</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: 'error.light', fontFamily: 'monospace' }}>
                    ₹{summary.bucket61_90.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Above 90 Days */}
            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <Card variant="outlined" sx={{ borderRadius: '12px', bgcolor: 'rgba(211, 47, 47, 0.02)', borderLeft: '4px solid', borderLeftColor: 'error.main' }}>
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'error.main' }}>&gt;90 DAYS OVERDUE</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: 'error.main', fontFamily: 'monospace' }}>
                    ₹{summary.bucketAbove90.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Graphical Ageing Progress bar */}
          <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Receivable Risk Distribution Map</Typography>
              <Typography variant="caption" color="text.secondary">Goal: Keep &gt;60 Overdue under 10% of total book</Typography>
            </Box>
            <Box sx={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
              {summary.totalOutstanding > 0 ? (
                <>
                  <Box sx={{ width: `${(summary.current / summary.totalOutstanding) * 100}%`, bgcolor: 'success.main' }} title="Current" />
                  <Box sx={{ width: `${(summary.bucket1_30 / summary.totalOutstanding) * 100}%`, bgcolor: 'warning.main' }} title="1-30 Days" />
                  <Box sx={{ width: `${(summary.bucket31_60 / summary.totalOutstanding) * 100}%`, bgcolor: 'orange' }} title="31-60 Days" />
                  <Box sx={{ width: `${(summary.bucket61_90 / summary.totalOutstanding) * 100}%`, bgcolor: 'error.light' }} title="61-90 Days" />
                  <Box sx={{ width: `${(summary.bucketAbove90 / summary.totalOutstanding) * 100}%`, bgcolor: 'error.main' }} title="&gt;90 Days" />
                </>
              ) : (
                <Box sx={{ width: '100%', bgcolor: 'action.hover' }} />
              )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                <Typography variant="caption" color="text.secondary">Current ({summary.totalOutstanding > 0 ? ((summary.current / summary.totalOutstanding) * 100).toFixed(0) : 0}%)</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />
                <Typography variant="caption" color="text.secondary">1-30d ({summary.totalOutstanding > 0 ? ((summary.bucket1_30 / summary.totalOutstanding) * 100).toFixed(0) : 0}%)</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'orange' }} />
                <Typography variant="caption" color="text.secondary">31-60d ({summary.totalOutstanding > 0 ? ((summary.bucket31_60 / summary.totalOutstanding) * 100).toFixed(0) : 0}%)</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.light' }} />
                <Typography variant="caption" color="text.secondary">61-90d ({summary.totalOutstanding > 0 ? ((summary.bucket61_90 / summary.totalOutstanding) * 100).toFixed(0) : 0}%)</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
                <Typography variant="caption" color="text.secondary">&gt;90d ({summary.totalOutstanding > 0 ? ((summary.bucketAbove90 / summary.totalOutstanding) * 100).toFixed(0) : 0}%)</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Filter and Table Card */}
      <Card variant="outlined" sx={{ borderRadius: '12px' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            {/* Search Bar */}
            <TextField
              size="small"
              placeholder="Search Invoice Number or Customer Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flexGrow: 1, minWidth: '260px' }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} />
                    </InputAdornment>
                  ),
                }
              }}
            />

            {/* Customer Filter */}
            <TextField
              select
              size="small"
              label="Filter Customer"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              sx={{ minWidth: '180px' }}
            >
              <MenuItem value="ALL">All Customers</MenuItem>
              {uniqueCustomers.map(cust => (
                <MenuItem key={cust} value={cust}>{cust}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px', boxShadow: 'none' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Customer Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Invoice Details</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Billing Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Invoice Amount</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Amount Collected</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Outstanding Balance</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Ageing Period</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOutstandings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <TrendingUp size={40} className="mx-auto text-gray-300 mb-2" />
                      <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                        No Active Outstanding Accounts
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        All finalized invoices have been settled in full. Perfect cash realization!
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOutstandings.map((out) => {
                    const today = new Date();
                    const due = new Date(out.dueDate);
                    const isOverdue = today > due;
                    
                    let overdueDays = 0;
                    if (isOverdue) {
                      const diffTime = today.getTime() - due.getTime();
                      overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    }

                    return (
                      <TableRow key={out.invoiceId} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {out.customerName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {out.invoiceNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Calendar size={12} className="text-gray-400" />
                            {out.invoiceDate}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ 
                            fontWeight: isOverdue ? 'bold' : 'normal', 
                            color: isOverdue ? 'error.main' : 'text.primary',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <Clock size={12} className={isOverdue ? "text-red-500" : "text-gray-400"} />
                            {out.dueDate}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            ₹{out.invoiceAmount.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'success.main' }}>
                            ₹{out.amountReceived.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: isOverdue ? 'error.main' : 'warning.main' }}>
                            ₹{out.balanceDue.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {isOverdue ? (
                            <Chip 
                              label={`${overdueDays} Days Overdue`} 
                              size="small" 
                              sx={{ 
                                bgcolor: overdueDays > 90 ? 'rgba(211, 47, 47, 0.08)' : (overdueDays > 60 ? 'rgba(237, 108, 2, 0.08)' : 'rgba(237, 108, 2, 0.04)'),
                                color: getAgeingDaysColor(overdueDays),
                                fontWeight: 'bold',
                                border: '1px solid',
                                borderColor: getAgeingDaysColor(overdueDays)
                              }} 
                            />
                          ) : (
                            <Chip 
                              label="Not Overdue" 
                              size="small" 
                              color="success" 
                              variant="outlined"
                              sx={{ fontWeight: 'bold' }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
