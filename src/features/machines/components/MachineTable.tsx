/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Box,
  Typography,
  Chip,
  InputAdornment,
  Collapse,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Clear as ClearIcon,
  Settings as SettingsIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as SpeedIcon,
  SquareFoot as SizeIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { MachineMasterItem } from '../types';

interface MachineTableProps {
  machines: MachineMasterItem[];
  onEdit: (machine: MachineMasterItem) => void;
  onDelete: (id: string) => void;
  onAddClick: () => void;
}

export default function MachineTable({
  machines,
  onEdit,
  onDelete,
  onAddClick
}: MachineTableProps) {
  // Filters and Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');

  // Interactive row expansion states
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // View full details modal state
  const [detailModalMachine, setDetailModalMachine] = useState<MachineMasterItem | null>(null);

  // Deletion Confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Extract unique types for filters
  const uniqueTypes = useMemo(() => {
    const types = new Set(machines.map((m) => m.machineType));
    return ['All', ...Array.from(types)];
  }, [machines]);

  const handleToggleExpand = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setTypeFilter('All');
    setStatusFilter('All');
    setMethodFilter('All');
  };

  // Filter and Search logic
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const matchesSearch =
        m.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.machineCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.machineType.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'All' || m.machineType === typeFilter;
      const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
      const matchesMethod = methodFilter === 'All' || m.printingMethod === methodFilter;

      return matchesSearch && matchesType && matchesStatus && matchesMethod;
    });
  }, [machines, searchTerm, typeFilter, statusFilter, methodFilter]);

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const getStatusChipColor = (status: string) => {
    return status === 'Active' ? 'success' : 'error';
  };

  return (
    <Box>
      {/* Search and Filters Dashboard Bar */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              placeholder="Search by name, code, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }
              }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="filter-type-label">Machine Type</InputLabel>
              <Select
                labelId="filter-type-label"
                id="filter-type"
                value={typeFilter}
                label="Machine Type"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {uniqueTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="filter-status-label">Status</InputLabel>
              <Select
                labelId="filter-status-label"
                id="filter-status"
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="All">All Statuses</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="filter-method-label">Printing Method</InputLabel>
              <Select
                labelId="filter-method-label"
                id="filter-method"
                value={methodFilter}
                label="Printing Method"
                onChange={(e) => setMethodFilter(e.target.value)}
              >
                <MenuItem value="All">All Methods</MenuItem>
                <MenuItem value="Sheetwise">Sheetwise</MenuItem>
                <MenuItem value="Work & Turn">Work & Turn</MenuItem>
                <MenuItem value="Work & Tumble">Work & Tumble</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 2 }} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            {(searchTerm || typeFilter !== 'All' || statusFilter !== 'All' || methodFilter !== 'All') && (
              <Button
                id="btn-clear-filters"
                variant="text"
                color="inherit"
                size="small"
                onClick={handleClearFilters}
                startIcon={<ClearIcon />}
                sx={{ textTransform: 'none' }}
              >
                Clear
              </Button>
            )}
            <Button
              id="btn-add-machine-top"
              variant="contained"
              color="primary"
              size="medium"
              onClick={onAddClick}
              startIcon={<AddIcon />}
              sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 1.5 }}
            >
              Add Machine
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Dense Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table aria-label="machine master table" size="medium">
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell width="50px" />
              <TableCell sx={{ fontWeight: 'bold' }}>Machine Name / Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Machine Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Colors</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Max Sheet Size (mm)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Average Speed</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Method</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMachines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No machinery found matching the search criteria.
                  </Typography>
                  <Button
                    id="btn-table-reset-filters"
                    variant="outlined"
                    size="small"
                    color="primary"
                    onClick={handleClearFilters}
                    sx={{ mt: 1, textTransform: 'none' }}
                  >
                    Reset Filters
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              filteredMachines.map((m) => {
                const isExpanded = expandedRowId === m.id;
                return (
                  <React.Fragment key={m.id}>
                    <TableRow hover sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' } }} onClick={() => handleToggleExpand(m.id)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          aria-label="expand row"
                          size="small"
                          onClick={() => handleToggleExpand(m.id)}
                        >
                          {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                            {m.machineName}
                          </Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                            {m.machineCode}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={m.machineType} size="small" variant="outlined" color="primary" />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'medium' }}>{m.numColors}C</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>
                        {m.maxSheetWidth} x {m.maxSheetHeight}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'medium' }}>
                        {m.avgSpeed.toLocaleString()} S/H
                      </TableCell>
                      <TableCell>{m.printingMethod}</TableCell>
                      <TableCell>
                        <Chip
                          label={m.status}
                          size="small"
                          color={getStatusChipColor(m.status)}
                          sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title="View Specifications">
                            <IconButton
                              id={`btn-view-details-${m.id}`}
                              size="small"
                              color="info"
                              onClick={() => setDetailModalMachine(m)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Machine">
                            <IconButton
                              id={`btn-edit-machine-${m.id}`}
                              size="small"
                              color="primary"
                              onClick={() => onEdit(m)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Machine">
                            <IconButton
                              id={`btn-delete-machine-${m.id}`}
                              size="small"
                              color="error"
                              onClick={(e) => handleDeleteClick(m.id, e)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>

                    {/* Collapsible specifications panel */}
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2.5, pb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom component="div" color="primary" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <SettingsIcon fontSize="small" /> Specs Overview for {m.machineName}
                            </Typography>
                            <Grid container spacing={3} sx={{ mt: 0.5 }}>
                              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <SizeIcon color="action" fontSize="small" />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Plate Size (W x H)</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      {m.plateSizeWidth > 0 && m.plateSizeHeight > 0 ? `${m.plateSizeWidth} x ${m.plateSizeHeight} mm` : 'N/A'}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <MoneyIcon color="action" fontSize="small" />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Costings</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      Plate: Rs. {m.plateCost} | Print/1k: Rs. {m.printChargePer1000}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <SpeedIcon color="action" fontSize="small" />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Register Settings</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      Time: {m.registerTime} min | Waste: {m.registerWastage} shts
                                    </Typography>
                                  </Box>
                                </Box>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <SizeIcon color="action" fontSize="small" />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Margins (mm)</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      G: {m.gripperMargin} | L: {m.leftMargin} | R: {m.rightMargin} | T: {m.tailMargin}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Grid>
                              <Grid size={{ xs: 12 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Supported Sheet Sizes</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {m.supportedSheetSizes.split(',').map((size, idx) => (
                                    <Chip key={idx} label={size.trim()} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
                                  ))}
                                </Box>
                              </Grid>
                            </Grid>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- SPECIFICATIONS OVERVIEW MODAL (Full specs) --- */}
      <Dialog
        open={!!detailModalMachine}
        onClose={() => setDetailModalMachine(null)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        {detailModalMachine && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{detailModalMachine.machineName}</Typography>
                <Typography variant="subtitle2" color="text.secondary">Code: {detailModalMachine.machineCode}</Typography>
              </Box>
              <Chip label={detailModalMachine.status} color={getStatusChipColor(detailModalMachine.status)} sx={{ fontWeight: 'bold' }} />
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ py: 3 }}>
              <Grid container spacing={3}>
                {/* Specs Section 1 */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                    GENERAL SPECIFICATIONS
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Machine Type</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{detailModalMachine.machineType}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Number of Colors</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{detailModalMachine.numColors} Colors</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Average Speed</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{detailModalMachine.avgSpeed.toLocaleString()} Sheets/Hour</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Printing Method</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{detailModalMachine.printingMethod}</Typography>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Specs Section 2 */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                    PHYSICAL SIZE LIMITATIONS
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Plate Size Width</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{detailModalMachine.plateSizeWidth > 0 ? `${detailModalMachine.plateSizeWidth} mm` : 'N/A'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Plate Size Height</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{detailModalMachine.plateSizeHeight > 0 ? `${detailModalMachine.plateSizeHeight} mm` : 'N/A'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Maximum Sheet Width</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{detailModalMachine.maxSheetWidth} mm</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Maximum Sheet Height</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{detailModalMachine.maxSheetHeight} mm</Typography>
                    </Grid>
                  </Grid>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider />
                </Grid>

                {/* Specs Section 3 */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                    ESTIMATION & COSTING VARIABLES
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">CTP Plate Cost</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Rs. {detailModalMachine.plateCost}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Printing Charge per 1000 Imp.</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Rs. {detailModalMachine.printChargePer1000}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Register Time Setup</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{detailModalMachine.registerTime} Minutes</Typography>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Specs Section 4 */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                    WASTAGE & MARGIN CONTROLS
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Register Wastage Sheets</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{detailModalMachine.registerWastage} Sheets</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Make-Ready Wastage Sheets</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{detailModalMachine.makeReadyWastage} Sheets</Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary">Machine Non-Print Margins (mm)</Typography>
                      <Box sx={{ mt: 0.5, display: 'flex', gap: 1 }}>
                        <Chip label={`Gripper: ${detailModalMachine.gripperMargin}mm`} size="small" variant="outlined" />
                        <Chip label={`Left: ${detailModalMachine.leftMargin}mm`} size="small" variant="outlined" />
                        <Chip label={`Right: ${detailModalMachine.rightMargin}mm`} size="small" variant="outlined" />
                        <Chip label={`Tail: ${detailModalMachine.tailMargin}mm`} size="small" variant="outlined" />
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider />
                </Grid>

                {/* Sizes Section */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                    COMPATIBLE AND SUPPORTED PRESS SHEET SIZES
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {detailModalMachine.supportedSheetSizes.split(',').map((size, idx) => (
                      <Chip key={idx} label={size.trim()} color="info" variant="outlined" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }} />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <Divider />
            <DialogActions>
              <Button onClick={() => setDetailModalMachine(null)} variant="contained" sx={{ fontWeight: 'bold' }}>
                Close Spec Sheet
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* --- CONFIRM DELETION MODAL --- */}
      <Dialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <WarningIcon /> Confirm Machinery Deletion
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you absolutely sure you want to remove this machine configuration? This operation cannot be undone and will delete the rate cards, speeds, margins, and wastage configurations associated with it.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)} color="inherit">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" sx={{ fontWeight: 'bold' }}>
            Confirm Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
