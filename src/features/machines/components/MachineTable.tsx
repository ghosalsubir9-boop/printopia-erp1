/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
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
  Tooltip,
  Alert,
  Snackbar,
  SelectChangeEvent,
  Card,
  CardContent
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
  Warning as WarningIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Business as FactoryIcon,
  Today as TodayIcon,
  Percent as PercentIcon
} from '@mui/icons-material';
import { MachineMasterItem, PrintingMethod, MachineStatus } from '../types';
import { validateMachine } from '../validation/machineValidator';

interface MachineTableProps {
  machines: MachineMasterItem[];
  onEdit: (machine: MachineMasterItem) => void;
  onDelete: (id: string) => void;
  onAddClick: () => void;
  onImportSuccess: (imported: MachineMasterItem[]) => void;
}

export default function MachineTable({
  machines,
  onEdit,
  onDelete,
  onAddClick,
  onImportSuccess
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

  // Notifications states
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });

  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract unique machine types for filters dynamically
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

  // Filter and Search logic (utilizes search matching on names, code, manufacturer)
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const matchesSearch =
        m.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.machineCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.machineType.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'All' || m.machineType === typeFilter;
      const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
      const matchesMethod =
        methodFilter === 'All' ||
        (m.supportedPrintingMethods && m.supportedPrintingMethods.includes(methodFilter as PrintingMethod));

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
      setSnackbar({
        open: true,
        message: 'Machine configuration deleted successfully.',
        severity: 'success'
      });
    }
  };

  // CSV Export Engine
  const handleExportCSV = () => {
    if (machines.length === 0) {
      setSnackbar({ open: true, message: 'No machine logs to export.', severity: 'warning' });
      return;
    }

    const headers = [
      'Machine Code', 'Machine Name', 'Machine Type', 'Manufacturer', 'Installation Year',
      'Colors', 'Max Width (mm)', 'Max Height (mm)', 'Min Width (mm)', 'Min Height (mm)',
      'Printable Width (mm)', 'Printable Height (mm)', 'Plate Width (mm)', 'Plate Height (mm)',
      'Gripper Margin (mm)', 'Left Margin (mm)', 'Right Margin (mm)', 'Tail Margin (mm)',
      'Average Speed (SH)', 'Setup Time (min)', 'Setup Waste (shts)', 'Run Waste (shts)',
      'Plate Cost (Rs)', 'Print Charge/1000 (Rs)', 'Methods', 'Status'
    ];

    const rows = machines.map((m) => [
      m.machineCode, m.machineName, m.machineType, m.manufacturer, m.installationYear,
      m.numColors, m.maxSheetWidth, m.maxSheetHeight, m.minSheetWidth, m.minSheetHeight,
      m.printableAreaWidth, m.printableAreaHeight, m.plateSizeWidth, m.plateSizeHeight,
      m.gripperMargin, m.leftMargin, m.rightMargin, m.tailMargin,
      m.avgSpeed, m.registerTime, m.registerWastage, m.makeReadyWastage,
      m.plateCost, m.printChargePer1000,
      m.supportedPrintingMethods ? m.supportedPrintingMethods.join(';') : '',
      m.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `printopia_machine_master_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSnackbar({ open: true, message: 'CSV records generated and downloaded successfully.', severity: 'success' });
  };

  // JSON Export Engine
  const handleExportJSON = () => {
    if (machines.length === 0) {
      setSnackbar({ open: true, message: 'No machine logs to export.', severity: 'warning' });
      return;
    }

    const jsonString = JSON.stringify(machines, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `printopia_machine_master_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSnackbar({ open: true, message: 'Full database JSON backup downloaded successfully.', severity: 'success' });
  };

  // JSON Import Trigger
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const importedData = JSON.parse(jsonContent);

        if (!Array.isArray(importedData)) {
          throw new Error('Import format error: Data must be a JSON array of machines.');
        }

        const validMachines: MachineMasterItem[] = [];
        let errorCount = 0;

        importedData.forEach((item: any, idx) => {
          // Re-validate against our business rule schemas
          const { isValid } = validateMachine(item, machines);
          
          if (isValid || (item.machineName && item.machineCode && item.maxSheetWidth > 0)) {
            // Re-bind timestamps if absent
            validMachines.push({
              id: item.id || `mm-imported-${Date.now()}-${idx}`,
              machineName: String(item.machineName),
              machineCode: String(item.machineCode).toUpperCase(),
              machineType: item.machineType || 'Offset',
              manufacturer: item.manufacturer || 'Unknown',
              installationYear: Number(item.installationYear || new Date().getFullYear()),
              numColors: Number(item.numColors || 4),
              plateSizeWidth: Number(item.plateSizeWidth || 0),
              plateSizeHeight: Number(item.plateSizeHeight || 0),
              maxSheetWidth: Number(item.maxSheetWidth || 0),
              maxSheetHeight: Number(item.maxSheetHeight || 0),
              minSheetWidth: Number(item.minSheetWidth || 0),
              minSheetHeight: Number(item.minSheetHeight || 0),
              printableAreaWidth: Number(item.printableAreaWidth || item.maxSheetWidth || 0),
              printableAreaHeight: Number(item.printableAreaHeight || item.maxSheetHeight || 0),
              gripperMargin: Number(item.gripperMargin || 0),
              leftMargin: Number(item.leftMargin || 0),
              rightMargin: Number(item.rightMargin || 0),
              tailMargin: Number(item.tailMargin || 0),
              avgSpeed: Number(item.avgSpeed || 10000),
              registerTime: Number(item.registerTime || 15),
              registerWastage: Number(item.registerWastage || 50),
              makeReadyWastage: Number(item.makeReadyWastage || 150),
              plateCost: Number(item.plateCost || 0),
              printChargePer1000: Number(item.printChargePer1000 || 0),
              supportedPrintingMethods: item.supportedPrintingMethods || ['Sheetwise'],
              status: (item.status as MachineStatus) || 'Active',
              sheetMappings: item.sheetMappings || [],
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: item.createdBy || 'imported',
              updatedBy: 'subir.ghosal'
            });
          } else {
            errorCount++;
          }
        });

        if (validMachines.length === 0) {
          throw new Error('No valid machine specifications could be parsed from the file.');
        }

        onImportSuccess(validMachines);
        
        const msg = errorCount > 0 
          ? `Imported ${validMachines.length} machines successfully! (Skipped ${errorCount} invalid rows).`
          : `All ${validMachines.length} machine profiles imported successfully from backup.`;

        setSnackbar({ open: true, message: msg, severity: 'success' });
      } catch (err: any) {
        setSnackbar({ open: true, message: err.message || 'Error processing imported JSON file.', severity: 'error' });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''; // clear input
      }
    };

    reader.readAsText(file);
  };

  const getStatusChipColor = (status: string) => {
    return status === 'Active' ? 'success' : 'error';
  };

  return (
    <Box>
      {/* Hidden file uploader */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleFileImportChange}
      />

      {/* Main Database & Controls Toolbar */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              placeholder="Search press, OEM, or code..."
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
              <InputLabel id="filter-status-label">Operational Status</InputLabel>
              <Select
                labelId="filter-status-label"
                id="filter-status"
                value={statusFilter}
                label="Operational Status"
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
                <MenuItem value="Perfecting">Perfecting</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }} sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}>
            <Tooltip title="Export current registry log list to CSV">
              <Button
                id="btn-export-csv"
                variant="outlined"
                color="inherit"
                size="small"
                onClick={handleExportCSV}
                startIcon={<ExportIcon />}
                sx={{ textTransform: 'none', px: 1.5 }}
              >
                CSV
              </Button>
            </Tooltip>
            <Tooltip title="Download database JSON backup file">
              <Button
                id="btn-export-json"
                variant="outlined"
                color="inherit"
                size="small"
                onClick={handleExportJSON}
                startIcon={<ExportIcon />}
                sx={{ textTransform: 'none', px: 1.5 }}
              >
                JSON
              </Button>
            </Tooltip>
            <Tooltip title="Upload JSON machine registry logs">
              <Button
                id="btn-import-json"
                variant="outlined"
                color="secondary"
                size="small"
                onClick={handleImportClick}
                startIcon={<ImportIcon />}
                sx={{ textTransform: 'none', px: 1.5 }}
              >
                Import
              </Button>
            </Tooltip>
          </Grid>
        </Grid>

        {(searchTerm || typeFilter !== 'All' || statusFilter !== 'All' || methodFilter !== 'All') && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-start' }}>
            <Button
              id="btn-clear-filters-bar"
              variant="text"
              color="primary"
              size="small"
              onClick={handleClearFilters}
              startIcon={<ClearIcon />}
              sx={{ textTransform: 'none', fontWeight: 'bold' }}
            >
              Clear Active Filters ({filteredMachines.length} machines matching)
            </Button>
          </Box>
        )}
      </Paper>

      {/* Main Table Layout */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 4 }}>
        <Table aria-label="enterprise machine master table" size="medium">
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell width="40px" />
              <TableCell sx={{ fontWeight: 'bold' }}>Machine Model / Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Manufacturer</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Colors / Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Max Sheet Size</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Speed / Rate (SH)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Costing profile</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMachines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                  <Typography variant="body1" color="text.secondary" gutterBottom sx={{ fontWeight: 'medium' }}>
                    No machinery listed matching current filters.
                  </Typography>
                  <Button
                    id="btn-add-machine-empty"
                    variant="contained"
                    size="small"
                    onClick={onAddClick}
                    startIcon={<AddIcon />}
                    sx={{ mt: 1, textTransform: 'none', fontWeight: 'bold' }}
                  >
                    Register First Machine
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              filteredMachines.map((m) => {
                const isExpanded = expandedRowId === m.id;
                return (
                  <React.Fragment key={m.id}>
                    {/* Primary Row */}
                    <TableRow
                      hover
                      sx={{
                        cursor: 'pointer',
                        '& > *': { borderBottom: 'unset' },
                        bgcolor: isExpanded ? 'rgba(37, 99, 235, 0.02)' : 'inherit'
                      }}
                      onClick={() => handleToggleExpand(m.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          aria-label="expand row details"
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
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontWeight: 'medium' }}>
                            {m.machineCode}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'medium' }}>{m.manufacturer}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={`${m.numColors}C`} size="small" variant="outlined" color="secondary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                          <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary', fontSize: '0.8rem' }}>
                            {m.machineType}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.825rem', fontWeight: 'medium' }}>
                        {m.maxSheetWidth} × {m.maxSheetHeight} mm
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.825rem' }}>
                            {m.avgSpeed.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            Sheets/Hour
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'medium', fontSize: '0.8rem' }}>
                            Plate: Rs.{m.plateCost}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            Imp/1k: Rs.{m.printChargePer1000}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={m.status}
                          size="small"
                          color={getStatusChipColor(m.status)}
                          sx={{ fontWeight: 'bold', fontSize: '0.725rem', height: 20 }}
                        />
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title="View Complete Specs">
                            <IconButton
                              id={`btn-view-details-${m.id}`}
                              size="small"
                              color="info"
                              onClick={() => setDetailModalMachine(m)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Specifications">
                            <IconButton
                              id={`btn-edit-machine-${m.id}`}
                              size="small"
                              color="primary"
                              onClick={() => onEdit(m)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Decommission Machine">
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

                    {/* Expandable Specifications Panel */}
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2.5, pb: 2 }}>
                            <Grid container spacing={3}>
                              {/* Mechanical Profile Grid */}
                              <Grid size={{ xs: 12, md: 8 }}>
                                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5 }}>
                                  <SettingsIcon fontSize="small" /> Mechanical Bounds & Margins
                                </Typography>
                                <Grid container spacing={2}>
                                  <Grid size={{ xs: 6, sm: 3 }}>
                                    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Min Sheet Size</Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                                        {m.minSheetWidth}×{m.minSheetHeight} mm
                                      </Typography>
                                    </Box>
                                  </Grid>
                                  <Grid size={{ xs: 6, sm: 3 }}>
                                    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Max Printable Area</Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                                        {m.printableAreaWidth}×{m.printableAreaHeight} mm
                                      </Typography>
                                    </Box>
                                  </Grid>
                                  <Grid size={{ xs: 6, sm: 3 }}>
                                    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Plate Specs</Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                                        {m.plateSizeWidth > 0 ? `${m.plateSizeWidth}×${m.plateSizeHeight} mm` : 'Digital N/A'}
                                      </Typography>
                                    </Box>
                                  </Grid>
                                  <Grid size={{ xs: 6, sm: 3 }}>
                                    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>OEM Manufacture</Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                        {m.manufacturer} ({m.installationYear})
                                      </Typography>
                                    </Box>
                                  </Grid>
                                  <Grid size={{ xs: 12 }}>
                                    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>NON-PRINT SAFETY MARGINS:</Typography>
                                      <Chip label={`Gripper: ${m.gripperMargin} mm`} size="small" variant="outlined" />
                                      <Chip label={`Left Side: ${m.leftMargin} mm`} size="small" variant="outlined" />
                                      <Chip label={`Right Side: ${m.rightMargin} mm`} size="small" variant="outlined" />
                                      <Chip label={`Tail end: ${m.tailMargin} mm`} size="small" variant="outlined" />
                                    </Box>
                                  </Grid>
                                  <Grid size={{ xs: 12 }}>
                                    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>SUPPORTED PRINTING METHODS:</Typography>
                                      {m.supportedPrintingMethods && m.supportedPrintingMethods.map((method, i) => (
                                        <Chip key={i} label={method} size="small" color="primary" variant="outlined" sx={{ fontWeight: 'bold' }} />
                                      ))}
                                    </Box>
                                  </Grid>
                                </Grid>
                              </Grid>

                              {/* Sheet Sizing Cut Mappings Grid */}
                              <Grid size={{ xs: 12, md: 4 }}>
                                <Typography variant="subtitle2" color="secondary" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5 }}>
                                  <SizeIcon fontSize="small" /> Parent → Machine Sheets ({m.sheetMappings ? m.sheetMappings.length : 0})
                                </Typography>
                                <Box sx={{ maxHeight: 180, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1 }}>
                                  {(!m.sheetMappings || m.sheetMappings.length === 0) ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 4 }}>
                                      No parent-to-machine cuts mapped. Click edit to establish.
                                    </Typography>
                                  ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                      {m.sheetMappings.map((map) => (
                                        <Paper key={map.id} variant="outlined" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.default' }}>
                                          <Box>
                                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 'bold', display: 'block' }}>
                                              {map.parentWidth}×{map.parentHeight} → {map.machineWidth}×{map.machineHeight}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                              {map.label || 'Cut specification'}
                                            </Typography>
                                          </Box>
                                        </Paper>
                                      ))}
                                    </Box>
                                  )}
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

      {/* --- ENTERPRISE SPECIFICATIONS OVERVIEW DIALOG --- */}
      <Dialog
        open={!!detailModalMachine}
        onClose={() => setDetailModalMachine(null)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4, overflow: 'hidden' } } }}
      >
        {detailModalMachine && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, bgcolor: 'action.hover' }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, tracking: '-0.3px', mb: 0.5 }}>{detailModalMachine.machineName}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'primary.main', color: 'white', px: 1, py: 0.3, borderRadius: 1, fontWeight: 'bold' }}>
                    CODE: {detailModalMachine.machineCode}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                    Type: {detailModalMachine.machineType}
                  </Typography>
                </Box>
              </Box>
              <Chip label={detailModalMachine.status} color={getStatusChipColor(detailModalMachine.status)} sx={{ fontWeight: 'bold', px: 1.5 }} />
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ py: 4, px: 3 }}>
              <Grid container spacing={4}>
                
                {/* Specs Section 1 */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <FactoryIcon fontSize="small" /> GENERAL MANUFACTURER SPECIFICATIONS
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>OEM Manufacturer</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailModalMachine.manufacturer}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Installation Year</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailModalMachine.installationYear}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Number of Colors</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailModalMachine.numColors} Towers</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Max Run Speed</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailModalMachine.avgSpeed.toLocaleString()} Sheets/Hour</Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Supported Methods</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {detailModalMachine.supportedPrintingMethods ? detailModalMachine.supportedPrintingMethods.map((me, i) => (
                          <Chip key={i} label={me} size="small" color="primary" variant="outlined" sx={{ fontWeight: 'bold', height: 22 }} />
                        )) : <Chip label="Sheetwise" size="small" variant="outlined" />}
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Specs Section 2 */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <SizeIcon fontSize="small" /> PHYSICAL SIZING BOUNDS (mm)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Maximum Sheet Size</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {detailModalMachine.maxSheetWidth} × {detailModalMachine.maxSheetHeight} mm
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Minimum Sheet Size</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {detailModalMachine.minSheetWidth} × {detailModalMachine.minSheetHeight} mm
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Plate Width / Height</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {detailModalMachine.plateSizeWidth > 0 ? `${detailModalMachine.plateSizeWidth} × ${detailModalMachine.plateSizeHeight} mm` : 'Digital (N/A)'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Printable Area Bounds</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {detailModalMachine.printableAreaWidth} × {detailModalMachine.printableAreaHeight} mm
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Margins Safety Spacing</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
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

                {/* Specs Section 3 */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="secondary" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <MoneyIcon fontSize="small" /> ESTIMATION & FINANCIALS (Rs.)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>CTP Plate Cost</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        Rs. {detailModalMachine.plateCost}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Printing Run Charge / 1,000 Imp.</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        Rs. {detailModalMachine.printChargePer1000}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Setup Register Time</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {detailModalMachine.registerTime} Minutes
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Specs Section 4 */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="secondary" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PercentIcon fontSize="small" /> WASTAGE CONTROLS & TEST REJECTS
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Register Setup Waste</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {detailModalMachine.registerWastage} Sheets
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Make-Ready Run Waste</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {detailModalMachine.makeReadyWastage} Sheets
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider />
                </Grid>

                {/* Sheet Mappings List in Detail */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>
                    PARENT STANDARD SIZES TO MACHINE CUT MAPPINGS
                  </Typography>
                  {(!detailModalMachine.sheetMappings || detailModalMachine.sheetMappings.length === 0) ? (
                    <Typography variant="body2" color="text.secondary">
                      No sheet cutting configurations have been recorded for this machine profile.
                    </Typography>
                  ) : (
                    <Grid container spacing={2}>
                      {detailModalMachine.sheetMappings.map((map) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={map.id}>
                          <Card variant="outlined">
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Label: {map.label || 'Cut Specs'}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace', mt: 0.5 }}>
                                {map.parentWidth} × {map.parentHeight} in → {map.machineWidth} × {map.machineHeight} in
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Grid>

              </Grid>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 2, bgcolor: 'action.hover' }}>
              <Button onClick={() => setDetailModalMachine(null)} variant="contained" sx={{ px: 4, textTransform: 'none', fontWeight: 'bold' }}>
                Close Profile Panel
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* --- CONFIRM DELETION DIALOG --- */}
      <Dialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <WarningIcon /> Decommission Machine Configuration
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Are you absolutely sure you want to remove this machine config? This operation is permanent and irreversible in the Printopia ERP database, and will clear out any cost rates, safety margin offsets, and sheet sizing cuts registered with this specific press.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 2.5 }}>
          <Button onClick={() => setDeleteConfirmId(null)} color="inherit" sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" sx={{ fontWeight: 'bold', textTransform: 'none' }}>
            Yes, Delete Profile
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar alerts */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
