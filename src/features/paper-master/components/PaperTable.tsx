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
  Card,
  CardContent,
  LinearProgress
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
  Layers as GSMIcon,
  SquareFoot as SizeIcon,
  AttachMoney as MoneyIcon,
  Inventory as StockIcon,
  Warning as WarningIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Business as BrandIcon,
  Label as LabelIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import {
  PaperMasterItem,
  PaperCategory,
  ParentSheetSize,
  PaperGSM,
  PurchaseUnit
} from '../types';

interface PaperTableProps {
  papers: PaperMasterItem[];
  categories: PaperCategory[];
  gsmList: PaperGSM[];
  sheetSizes: ParentSheetSize[];
  purchaseUnits: PurchaseUnit[];
  onEdit: (paper: PaperMasterItem) => void;
  onDelete: (id: string) => void;
  onAddClick: () => void;
  onViewRateHistory: (paperId: string) => void;
  onAdjustStock: (paperId: string) => void;
  onImportSuccess: (imported: any[]) => void;
}

export default function PaperTable({
  papers,
  categories,
  gsmList,
  sheetSizes,
  purchaseUnits,
  onEdit,
  onDelete,
  onAddClick,
  onViewRateHistory,
  onAdjustStock,
  onImportSuccess
}: PaperTableProps) {
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [gsmFilter, setGsmFilter] = useState('All');
  const [sheetFilter, setSheetFilter] = useState('All');

  // Expansion and detail modal state
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [detailModalPaper, setDetailModalPaper] = useState<PaperMasterItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Snackbar states
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick lookup maps
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const gsmMap = useMemo(() => new Map(gsmList.map((g) => [g.id, g])), [gsmList]);
  const sheetMap = useMemo(() => new Map(sheetSizes.map((s) => [s.id, s])), [sheetSizes]);
  const unitMap = useMemo(() => new Map(purchaseUnits.map((u) => [u.id, u])), [purchaseUnits]);

  const handleToggleExpand = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('All');
    setStatusFilter('All');
    setGsmFilter('All');
    setSheetFilter('All');
  };

  // Filtering Logic
  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      const matchesSearch =
        p.paperName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.paperCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.remarks && p.remarks.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = categoryFilter === 'All' || p.categoryId === categoryFilter;
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchesGsm = gsmFilter === 'All' || p.supportedGSMIds.includes(gsmFilter);
      const matchesSheet = sheetFilter === 'All' || p.supportedSheetIds.includes(sheetFilter);

      return matchesSearch && matchesCategory && matchesStatus && matchesGsm && matchesSheet;
    });
  }, [papers, searchTerm, categoryFilter, statusFilter, gsmFilter, sheetFilter]);

  // JSON Export
  const handleExportData = () => {
    try {
      const dataStr = JSON.stringify(papers, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `Printopia_Paper_Master_Registry_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      setToast({ open: true, message: 'Registry specifications successfully exported as JSON.', severity: 'success' });
    } catch (e: any) {
      setToast({ open: true, message: `Export failed: ${e.message}`, severity: 'error' });
    }
  };

  // JSON Import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) {
          throw new Error('Import data must be a valid JSON array of papers.');
        }

        // Validate basic keys of the first item to ensure structure
        if (json.length > 0 && (!json[0].paperName || !json[0].paperCode)) {
          throw new Error('JSON structure does not represent Printopia Paper Master records.');
        }

        onImportSuccess(json);
        setToast({
          open: true,
          message: `Successfully synchronized ${json.length} paper profiles into local ERP catalog.`,
          severity: 'success'
        });
      } catch (err: any) {
        setToast({ open: true, message: `Import error: ${err.message}`, severity: 'error' });
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
      setToast({ open: true, message: 'Paper registered profile decommissioned successfully.', severity: 'warning' });
    }
  };

  return (
    <Box>
      {/* Control Actions & Filtering Console */}
      <Card variant="outlined" sx={{ mb: 4, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2, mb: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SearchIcon color="primary" fontSize="small" /> Search & Filter Console
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              <Button
                id="btn-import-papers"
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={<ImportIcon />}
                onClick={handleImportClick}
                sx={{ textTransform: 'none', fontWeight: 600, borderColor: 'divider' }}
              >
                Import Specs
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleFileChange}
              />
              <Button
                id="btn-export-papers"
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={<ExportIcon />}
                onClick={handleExportData}
                sx={{ textTransform: 'none', fontWeight: 600, borderColor: 'divider' }}
              >
                Export Registry
              </Button>
              <Button
                id="btn-add-paper-master"
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AddIcon />}
                onClick={onAddClick}
                sx={{ textTransform: 'none', fontWeight: 'bold' }}
              >
                Register Paper Spec
              </Button>
            </Box>
          </Box>

          <Grid container spacing={2}>
            {/* Search Input */}
            <Grid size={{ xs: 12, sm: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                placeholder="Search by name, code, brand, mill..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchTerm('')}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Grid>

            {/* Paper Type Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="category-filter-label">Paper Type</InputLabel>
                <Select
                  labelId="category-filter-label"
                  label="Paper Type"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="All">All Paper Types</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Status Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="All">All Statuses</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* GSM Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="gsm-filter-label">GSM Capacity</InputLabel>
                <Select
                  labelId="gsm-filter-label"
                  label="GSM Capacity"
                  value={gsmFilter}
                  onChange={(e) => setGsmFilter(e.target.value)}
                >
                  <MenuItem value="All">All GSM</MenuItem>
                  {gsmList.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      {g.gsmValue} GSM
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Parent Sheet Size Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="sheet-filter-label">Sheet Size</InputLabel>
                <Select
                  labelId="sheet-filter-label"
                  label="Sheet Size"
                  value={sheetFilter}
                  onChange={(e) => setSheetFilter(e.target.value)}
                >
                  <MenuItem value="All">All Sizes</MenuItem>
                  {sheetSizes.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name} {s.unit === 'inch' ? '"' : s.unit}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Filter Status Badge / Clear triggers */}
          {(searchTerm || categoryFilter !== 'All' || statusFilter !== 'All' || gsmFilter !== 'All' || sheetFilter !== 'All') && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                Showing <b>{filteredPapers.length}</b> matching paper specifications.
              </Typography>
              <Button
                size="small"
                color="primary"
                onClick={handleClearFilters}
                startIcon={<ClearIcon fontSize="small" />}
                sx={{ textTransform: 'none', fontWeight: 'bold' }}
              >
                Clear Filters
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Primary Data Grid / Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Table aria-label="paper master table">
          <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc' }}>
            <TableRow>
              <TableCell width={50} />
              <TableCell sx={{ fontWeight: 800 }}>Paper Details</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Paper Type</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Manufacturer / Brand</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPapers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium', mb: 1 }}>
                    No paper specifications found in the active registry.
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Try clearing search criteria or clicking "Register Paper Spec" to configure a new paper type.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredPapers.map((paper) => {
                const isExpanded = expandedRowId === paper.id;
                const catName = categoryMap.get(paper.categoryId)?.name || 'Unassigned';
                const unitName = unitMap.get(paper.purchaseUnitId)?.name || 'Per Sheet';
                
                // Stock indicators
                const st = paper.stock || { paperId: paper.id, openingStock: 0, availableStock: 0, reservedStock: 0, minimumStock: 0, reorderLevel: 0, closingStock: 0 };
                const isLowStock = st.availableStock <= st.minimumStock;
                const isReorder = st.availableStock <= st.reorderLevel && st.availableStock > st.minimumStock;
                const isOutOfStock = st.availableStock === 0;

                return (
                  <React.Fragment key={paper.id}>
                    <TableRow hover sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }} onClick={() => handleToggleExpand(paper.id)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <IconButton size="small" onClick={() => handleToggleExpand(paper.id)}>
                          {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {paper.paperName}
                          </Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                            {paper.paperCode}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={catName}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{
                            fontWeight: 'bold',
                            borderRadius: '4px'
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {paper.brand || 'No Brand'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Mfr: {paper.manufacturer || 'Unspecified'}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Chip
                          label={paper.status}
                          size="small"
                          color={paper.status === 'Active' ? 'success' : 'default'}
                          sx={{
                            fontWeight: 'bold',
                            fontSize: '0.7rem',
                            borderRadius: 1.5,
                            height: 22,
                            px: 0.5
                          }}
                        />
                      </TableCell>

                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title="View Detailed Profile">
                            <IconButton size="small" onClick={() => setDetailModalPaper(paper)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Specifications">
                            <IconButton size="small" onClick={() => onEdit(paper)}>
                              <EditIcon fontSize="small" color="primary" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Manage Historical Rates">
                            <IconButton size="small" onClick={() => onViewRateHistory(paper.id)}>
                              <HistoryIcon fontSize="small" color="secondary" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Adjust Stock Quantities">
                            <IconButton size="small" onClick={() => onAdjustStock(paper.id)}>
                              <StockIcon fontSize="small" color="success" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Decommission Paper Spec">
                            <IconButton size="small" onClick={() => setDeleteConfirmId(paper.id)}>
                              <DeleteIcon fontSize="small" color="error" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>

                    {/* Collapsible Row for comprehensive details */}
                    <TableRow onClick={(e) => e.stopPropagation()}>
                      <TableCell colSpan={6} sx={{ py: 0, px: 4 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 3, px: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#fcfdfe', borderLeft: '3px solid #2563eb', my: 1, borderRadius: 1 }}>
                            <Grid container spacing={3}>
                              
                              {/* Supported GSM list */}
                              <Grid size={{ xs: 12, sm: 4 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <GSMIcon fontSize="small" color="primary" /> Supported GSM Series
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                                  {paper.supportedGSMIds.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">No GSM limits configured.</Typography>
                                  ) : (
                                    paper.supportedGSMIds.map((id) => {
                                      const gsm = gsmMap.get(id);
                                      return (
                                        <Chip
                                          key={id}
                                          label={`${gsm?.gsmValue || 'Unknown'} GSM`}
                                          size="small"
                                          variant="filled"
                                          sx={{ height: 22, fontSize: '0.725rem', fontWeight: 600 }}
                                        />
                                      );
                                    })
                                  )}
                                </Box>
                              </Grid>

                              {/* Supported Sheet sizes */}
                              <Grid size={{ xs: 12, sm: 4 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <SizeIcon fontSize="small" color="secondary" /> Parent Sheet Capacities
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                                  {paper.supportedSheetIds.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">No sheet sizes configured.</Typography>
                                  ) : (
                                    paper.supportedSheetIds.map((id) => {
                                      const sheet = sheetMap.get(id);
                                      return (
                                        <Chip
                                          key={id}
                                          label={`${sheet?.name || 'Unknown'} (${sheet?.width}×${sheet?.height} ${sheet?.unit})`}
                                          size="small"
                                          variant="outlined"
                                          color="secondary"
                                          sx={{ height: 22, fontSize: '0.725rem', fontWeight: 600 }}
                                        />
                                      );
                                    })
                                  )}
                                </Box>
                              </Grid>

                              {/* Stock Breakdown ledger */}
                              <Grid size={{ xs: 12, sm: 4 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <StockIcon fontSize="small" color="success" /> Stock Quantities Breakdown
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Opening Stock:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{st.openingStock.toLocaleString()} {unitName}</Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Reserved Stock:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>{st.reservedStock.toLocaleString()} {unitName}</Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Minimum Level:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.light' }}>{st.minimumStock.toLocaleString()} {unitName}</Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Reorder Trigger:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'warning.light' }}>{st.reorderLevel.toLocaleString()} {unitName}</Typography>
                                  </Box>
                                </Box>
                              </Grid>

                              {/* Remarks */}
                              {paper.remarks && (
                                <Grid size={{ xs: 12 }}>
                                  <Divider sx={{ my: 1 }} />
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                                    Technical Remarks & Sourcing Directives:
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    "{paper.remarks}"
                                  </Typography>
                                </Grid>
                              )}

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

      {/* Decommission Confirmation Dialog */}
      <Dialog open={Boolean(deleteConfirmId)} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main', fontWeight: 'bold' }}>
          <WarningIcon /> Decommission Paper Profile?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you absolutely sure you want to decommission this paper specification from the active Printopia registry?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
            WARNING: This will permanently remove its links to GSM libraries, stock balances, and past logs. This operation cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteConfirmId(null)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={confirmDelete} variant="contained" color="error">
            Confirm Decommission
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail View Modal */}
      <Dialog
        open={Boolean(detailModalPaper)}
        onClose={() => setDetailModalPaper(null)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        {detailModalPaper && (
          <>
            <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>
                    Paper Master Specifications Card
                  </Typography>
                  <Typography variant="h5" color="text.primary" sx={{ fontWeight: 800 }}>
                    {detailModalPaper.paperName}
                  </Typography>
                </Box>
                <Chip
                  label={detailModalPaper.status}
                  color={detailModalPaper.status === 'Active' ? 'success' : 'default'}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
            </DialogTitle>
            <DialogContent sx={{ py: 3 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>PAPER CODE</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{detailModalPaper.paperCode}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>PAPER TYPE</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {categoryMap.get(detailModalPaper.categoryId)?.name || 'Unassigned'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>MANUFACTURER / MILL</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'semibold' }}>{detailModalPaper.manufacturer || 'N/A'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>BRAND NAME</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'semibold' }}>{detailModalPaper.brand || 'N/A'}</Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>SHADE / TINT</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'semibold' }}>{detailModalPaper.shade || 'N/A'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>GRAIN DIRECTION</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{detailModalPaper.grainDirection}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>PURCHASE TRADING UNIT</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {unitMap.get(detailModalPaper.purchaseUnitId)?.name || 'Per Sheet'} ({unitMap.get(detailModalPaper.purchaseUnitId)?.code || 'SHT'})
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>REGISTRY TIMESTAMP</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        Registered: {new Date(detailModalPaper.createdAt).toLocaleString()}
                        <br />
                        Last Sync: {new Date(detailModalPaper.updatedAt).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <GSMIcon fontSize="small" color="primary" /> Compatible GSM Library Values:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                    {detailModalPaper.supportedGSMIds.map((id) => {
                      const gsm = gsmMap.get(id);
                      return (
                        <Chip
                          key={id}
                          label={`${gsm?.gsmValue || 'Unknown'} GSM`}
                          variant="filled"
                          size="small"
                        />
                      );
                    })}
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SizeIcon fontSize="small" color="secondary" /> Supported Parent Sizes:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                    {detailModalPaper.supportedSheetIds.map((id) => {
                      const sheet = sheetMap.get(id);
                      return (
                        <Chip
                          key={id}
                          label={`${sheet?.name} (${sheet?.width}×${sheet?.height} ${sheet?.unit})`}
                          variant="outlined"
                          color="secondary"
                          size="small"
                        />
                      );
                    })}
                  </Box>
                </Grid>
                
                {detailModalPaper.remarks && (
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, borderLeft: '3px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                        REMARKS / SOURCING INSTRUCTIONS
                      </Typography>
                      <Typography variant="body2">{detailModalPaper.remarks}</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button onClick={() => setDetailModalPaper(null)} variant="contained" color="primary">
                Close Profile
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Internal success feedback toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((prev) => ({ ...prev, open: false }))} sx={{ width: '100%', borderRadius: 2 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
