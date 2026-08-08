/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Grid,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Eye as ViewIcon,
  Plus as AddIcon,
} from 'lucide-react';
import { ReworkTask, ReworkStatus } from '../types';
import { ReworkApiService } from '../services/reworkApi';

interface ReworkTaskListProps {
  onAdd: () => void;
  onView: (task: ReworkTask) => void;
}

export default function ReworkTaskList({ onAdd, onView }: ReworkTaskListProps) {
  const [tasks, setTasks] = useState<ReworkTask[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await ReworkApiService.getReworkTasks();
      setTasks(data);
    } catch (err) {
      console.error('Error loading rework tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(item => {
    const matchesSearch = 
      item.reworkTaskNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.assignedUser.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sourceQCNumber && item.sourceQCNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

    return !!(matchesSearch && matchesStatus);
  });

  const getStatusColor = (status: ReworkStatus) => {
    switch (status) {
      case 'Open':
        return 'primary';
      case 'In Progress':
        return 'warning';
      case 'Completed':
        return 'success';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Rework Operations Dashboard
        </Typography>
        <Button variant="contained" color="warning" startIcon={<AddIcon size={16} />} onClick={onAdd}>
          New Rework Task
        </Button>
      </Box>

      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search Rework Task #, PO #, Product, Source QC #, or operator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon size={16} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Rework Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="All">All Statuses</MenuItem>
                <MenuItem value="Open">Open</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          ) : filteredTasks.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">No rework tasks found.</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Rework Task Number</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Source QC Ref</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>PO Number</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Job Item / Product</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Rework Qty</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Assigned Dept</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Assigned Machine</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Assigned User</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Target Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Rework Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTasks.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 'medium' }}>{row.reworkTaskNumber}</TableCell>
                      <TableCell>{row.sourceQCNumber || 'Manual Task'}</TableCell>
                      <TableCell>{row.poNumber}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'semibold' }}>
                          Job-{String(row.jobItemIndex).padStart(2, '0')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.productName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'warning.dark' }}>
                        {row.reworkQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell>{row.assignedDepartment}</TableCell>
                      <TableCell>{row.assignedMachineName || 'Unassigned'}</TableCell>
                      <TableCell>{row.assignedUser}</TableCell>
                      <TableCell>{row.targetDate}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          size="small"
                          color={getStatusColor(row.status)}
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" title="Manage Rework Task" onClick={() => onView(row)}>
                          <ViewIcon size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
