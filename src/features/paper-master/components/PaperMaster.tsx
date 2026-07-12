/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  InputAdornment,
  FormHelperText
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Class as CatIcon,
  SquareFoot as SizeIcon,
  Layers as GSMIcon,
  LocalShipping as SourcingIcon,
  History as HistoryIcon,
  Inventory as StockIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendIcon,
  AttachMoney as RateIcon,
  KeyboardArrowRight as ArrowRightIcon,
  Sync as SyncIcon
} from '@mui/icons-material';

import {
  PaperMasterItem,
  PaperCategory,
  ParentSheetSize,
  PaperGSM,
  PurchaseUnit,
  PaperRateHistoryItem,
  PaperStockItem,
  PaperStatus,
  GrainDirection
} from '../types';
import { PaperApiService } from '../services/api';
import PaperTable from './PaperTable';
import PaperForm from './PaperForm';

export default function PaperMaster() {
  // Tab/Screen state
  // 0: Paper Registry (List/Form)
  // 1: Paper Stock
  // 2: Rate History
  // 3: Categories
  // 4: Parent Sheets
  // 5: GSM Library
  // 6: Purchase Units
  const [activeTab, setActiveTab] = useState<number>(0);

  // Core Data States
  const [papers, setPapers] = useState<PaperMasterItem[]>([]);
  const [categories, setCategories] = useState<PaperCategory[]>([]);
  const [gsmList, setGsmList] = useState<PaperGSM[]>([]);
  const [sheetSizes, setSheetSizes] = useState<ParentSheetSize[]>([]);
  const [purchaseUnits, setPurchaseUnits] = useState<PurchaseUnit[]>([]);
  const [allRates, setAllRates] = useState<PaperRateHistoryItem[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<'list' | 'add' | 'edit'>('list');
  const [selectedPaper, setSelectedPaper] = useState<PaperMasterItem | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Modal states for direct adjustments
  const [stockEditPaper, setStockEditPaper] = useState<PaperMasterItem | null>(null);
  const [stockForm, setStockForm] = useState<{ openingStock: number; availableStock: number; reservedStock: number; minimumStock: number; reorderLevel: number }>({
    openingStock: 0,
    availableStock: 0,
    reservedStock: 0,
    minimumStock: 0,
    reorderLevel: 0
  });

  const [rateEditPaper, setRateEditPaper] = useState<PaperMasterItem | null>(null);
  const [rateForm, setRateForm] = useState<{ rate: number; supplier: string; remarks: string; effectiveDate: string; purchaseUnitId: string }>({
    rate: 0,
    supplier: '',
    remarks: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    purchaseUnitId: ''
  });

  // Category CRUD modals
  const [categoryModal, setCategoryModal] = useState<{ open: boolean; id?: string; name: string; code: string; description: string }>({
    open: false,
    name: '',
    code: '',
    description: ''
  });

  // Parent Sheet CRUD modals
  const [sheetModal, setSheetModal] = useState<{ open: boolean; id?: string; name: string; width: number; height: number; unit: 'inch' | 'mm' }>({
    open: false,
    name: '',
    width: 0,
    height: 0,
    unit: 'inch'
  });

  // GSM CRUD modals
  const [gsmModal, setGsmModal] = useState<{ open: boolean; id?: string; gsmValue: number; description: string }>({
    open: false,
    gsmValue: 0,
    description: ''
  });

  // Purchase Unit CRUD modals
  const [unitModal, setUnitModal] = useState<{ open: boolean; id?: string; name: string; code: string }>({
    open: false,
    name: '',
    code: ''
  });

  // Load all central DB entities on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [pData, cData, gData, sData, uData, rData] = await Promise.all([
        PaperApiService.getPapers(),
        PaperApiService.getCategories(),
        PaperApiService.getGSMs(),
        PaperApiService.getParentSheets(),
        PaperApiService.getPurchaseUnits(),
        PaperApiService.getRateHistory()
      ]);

      setPapers(pData);
      setCategories(cData);
      setGsmList(gData);
      setSheetSizes(sData);
      setPurchaseUnits(uData);
      setAllRates(rData);
    } catch (e: any) {
      showToast(`Data load failure: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToast({ open: true, message, severity });
  };

  // ==========================================
  // PAPER CRUD OPERATIONS
  // ==========================================

  const handleAddClick = () => {
    setSelectedPaper(null);
    setCurrentView('add');
    setActiveTab(0);
  };

  const handleEditClick = (paper: PaperMasterItem) => {
    setSelectedPaper(paper);
    setCurrentView('edit');
    setActiveTab(0);
  };

  const handleDeletePaper = async (id: string) => {
    setIsLoading(true);
    try {
      await PaperApiService.deletePaper(id);
      setPapers((prev) => prev.filter((p) => p.id !== id));
      showToast('Paper specification successfully deleted.', 'warning');
    } catch (e: any) {
      showToast(`Deletion failed: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePaper = async (payload: any) => {
    setIsLoading(true);
    try {
      if (currentView === 'edit') {
        const updated = await PaperApiService.updatePaper(payload.id, payload);
        setPapers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showToast(`Specs for '${updated.paperName}' successfully saved!`, 'success');
      } else {
        const created = await PaperApiService.createPaper(payload);
        setPapers((prev) => [created, ...prev]);
        showToast(`Paper '${created.paperName}' added toactive catalog.`, 'success');
      }
      
      // Refresh rates list since initial rate might have been registered
      const freshRates = await PaperApiService.getRateHistory();
      setAllRates(freshRates);
      
      setCurrentView('list');
    } catch (e: any) {
      showToast(`Validation check failed: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSuccess = async (importedList: any[]) => {
    setIsLoading(true);
    try {
      for (const item of importedList) {
        try {
          const { id, createdAt, updatedAt, stock, ...params } = item;
          await PaperApiService.createPaper({
            ...params,
            initialStock: {
              openingStock: stock?.openingStock ?? 0,
              minimumStock: stock?.minimumStock ?? 0,
              reorderLevel: stock?.reorderLevel ?? 0
            }
          });
        } catch (err) {
          // Ignore duplicates during bulk import
          console.warn('Skipping duplicate code during JSON sync', item.paperCode);
        }
      }
      const refreshed = await PaperApiService.getPapers();
      const freshRates = await PaperApiService.getRateHistory();
      setPapers(refreshed);
      setAllRates(freshRates);
      showToast('Completed synchronization of imported profiles.', 'success');
    } catch (e: any) {
      showToast(`Bulk Sync Error: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // STOCK ADJUSTMENT
  // ==========================================

  const handleOpenStockEdit = (paper: PaperMasterItem) => {
    setStockEditPaper(paper);
    const st = paper.stock || { openingStock: 0, availableStock: 0, reservedStock: 0, minimumStock: 0, reorderLevel: 0 };
    setStockForm({
      openingStock: st.openingStock,
      availableStock: st.availableStock,
      reservedStock: st.reservedStock,
      minimumStock: st.minimumStock,
      reorderLevel: st.reorderLevel
    });
  };

  const handleSaveStock = async () => {
    if (!stockEditPaper) return;
    setIsLoading(true);
    try {
      const updatedStock = await PaperApiService.updateStock(stockEditPaper.id, stockForm);
      setPapers((prev) =>
        prev.map((p) => (p.id === stockEditPaper.id ? { ...p, stock: updatedStock } : p))
      );
      showToast(`Stock ledger updated for '${stockEditPaper.paperName}'.`, 'success');
      setStockEditPaper(null);
    } catch (e: any) {
      showToast(`Stock save error: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // RATES MANAGEMENT
  // ==========================================

  const handleOpenRateEdit = (paper: PaperMasterItem) => {
    setRateEditPaper(paper);
    setRateForm({
      rate: 0,
      supplier: '',
      remarks: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      purchaseUnitId: paper.purchaseUnitId
    });
  };

  const handleSaveRateHistory = async () => {
    if (!rateEditPaper) return;
    if (rateForm.rate < 0) {
      showToast('Sourcing rate cannot be negative.', 'error');
      return;
    }
    if (!rateForm.supplier.trim()) {
      showToast('Supplier name is required.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const createdRate = await PaperApiService.createRateHistoryItem({
        paperId: rateEditPaper.id,
        effectiveDate: rateForm.effectiveDate,
        purchaseUnitId: rateForm.purchaseUnitId,
        rate: rateForm.rate,
        supplier: rateForm.supplier.trim(),
        remarks: rateForm.remarks.trim()
      });

      setAllRates((prev) => [createdRate, ...prev]);
      
      // Update the modified paper's update date to trigger reload
      await PaperApiService.updatePaper(rateEditPaper.id, {});
      const freshPapers = await PaperApiService.getPapers();
      setPapers(freshPapers);

      showToast(`New historical rate logged for '${rateEditPaper.paperName}'`, 'success');
      setRateEditPaper(null);
    } catch (e: any) {
      showToast(`Failed to record rate history: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // CATEGORIES MASTER CRUD
  // ==========================================

  const handleSaveCategory = async () => {
    if (!categoryModal.name.trim() || !categoryModal.code.trim()) {
      showToast('Category name and code are mandatory.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (categoryModal.id) {
        const updated = await PaperApiService.updateCategory(categoryModal.id, {
          name: categoryModal.name,
          code: categoryModal.code,
          description: categoryModal.description
        });
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        showToast(`Category '${updated.name}' modified successfully.`, 'success');
      } else {
        const created = await PaperApiService.createCategory(
          categoryModal.name,
          categoryModal.code,
          categoryModal.description
        );
        setCategories((prev) => [...prev, created]);
        showToast(`Category '${created.name}' registered.`, 'success');
      }
      setCategoryModal({ open: false, name: '', code: '', description: '' });
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setIsLoading(true);
    try {
      await PaperApiService.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showToast('Category deleted successfully.', 'warning');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // PARENT SHEET SIZE CRUD
  // ==========================================

  const handleSaveSheet = async () => {
    if (!sheetModal.name.trim() || sheetModal.width <= 0 || sheetModal.height <= 0) {
      showToast('Valid dimensions and name are required.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (sheetModal.id) {
        const updated = await PaperApiService.updateParentSheet(sheetModal.id, {
          name: sheetModal.name,
          width: sheetModal.width,
          height: sheetModal.height,
          unit: sheetModal.unit
        });
        setSheetSizes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        showToast(`Sheet spec '${updated.name}' modified.`, 'success');
      } else {
        const created = await PaperApiService.createParentSheet(
          sheetModal.name,
          sheetModal.width,
          sheetModal.height,
          sheetModal.unit
        );
        setSheetSizes((prev) => [...prev, created]);
        showToast(`Sheet spec '${created.name}' registered.`, 'success');
      }
      setSheetModal({ open: false, name: '', width: 0, height: 0, unit: 'inch' });
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSheet = async (id: string) => {
    setIsLoading(true);
    try {
      await PaperApiService.deleteParentSheet(id);
      setSheetSizes((prev) => prev.filter((s) => s.id !== id));
      showToast('Sheet size decommissioned.', 'warning');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // GSM LIBRARY CRUD
  // ==========================================

  const handleSaveGSM = async () => {
    if (gsmModal.gsmValue <= 0) {
      showToast('GSM value must be positive.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (gsmModal.id) {
        const updated = await PaperApiService.updateGSM(gsmModal.id, {
          gsmValue: gsmModal.gsmValue,
          description: gsmModal.description
        });
        setGsmList((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        showToast(`GSM value ${updated.gsmValue} updated.`, 'success');
      } else {
        const created = await PaperApiService.createGSM(gsmModal.gsmValue, gsmModal.description);
        setGsmList((prev) => [...prev, created]);
        showToast(`GSM ${created.gsmValue} registered.`, 'success');
      }
      setGsmModal({ open: false, gsmValue: 0, description: '' });
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGSM = async (id: string) => {
    setIsLoading(true);
    try {
      await PaperApiService.deleteGSM(id);
      setGsmList((prev) => prev.filter((g) => g.id !== id));
      showToast('GSM value deleted.', 'warning');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // PURCHASE UNIT CRUD
  // ==========================================

  const handleSaveUnit = async () => {
    if (!unitModal.name.trim() || !unitModal.code.trim()) {
      showToast('Unit name and short code are mandatory.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (unitModal.id) {
        const updated = await PaperApiService.updatePurchaseUnit(unitModal.id, {
          name: unitModal.name,
          code: unitModal.code
        });
        setPurchaseUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        showToast(`Purchase unit '${updated.name}' saved.`, 'success');
      } else {
        const created = await PaperApiService.createPurchaseUnit(unitModal.name, unitModal.code);
        setPurchaseUnits((prev) => [...prev, created]);
        showToast(`Trading unit '${created.name}' registered.`, 'success');
      }
      setUnitModal({ open: false, name: '', code: '' });
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUnit = async (id: string) => {
    setIsLoading(true);
    try {
      await PaperApiService.deletePurchaseUnit(id);
      setPurchaseUnits((prev) => prev.filter((u) => u.id !== id));
      showToast('Purchase unit deleted.', 'warning');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // UTILITIES & MEMOS
  // ==========================================

  // Map lookups for rendering ids
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const paperMap = useMemo(() => new Map(papers.map((p) => [p.id, p])), [papers]);
  const unitMap = useMemo(() => new Map(purchaseUnits.map((u) => [u.id, u])), [purchaseUnits]);

  // Stock Alerts Metrics
  const stockMetrics = useMemo(() => {
    const totalCount = papers.length;
    let lowCount = 0;
    let reorderCount = 0;
    let outCount = 0;

    papers.forEach((p) => {
      const st = p.stock;
      if (!st) return;
      if (st.availableStock === 0) {
        outCount++;
      } else if (st.availableStock <= st.minimumStock) {
        lowCount++;
      } else if (st.availableStock <= st.reorderLevel) {
        reorderCount++;
      }
    });

    return { totalCount, lowCount, reorderCount, outCount };
  }, [papers]);

  const handleViewRateHistoryShortcut = (paperId: string) => {
    setActiveTab(2); // Jump to rate history tab
    const pObj = papers.find((p) => p.id === paperId);
    if (pObj) {
      handleOpenRateEdit(pObj);
    }
  };

  const handleAdjustStockShortcut = (paperId: string) => {
    setActiveTab(1); // Jump to stock monitoring tab
    const pObj = papers.find((p) => p.id === paperId);
    if (pObj) {
      handleOpenStockEdit(pObj);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, position: 'relative' }}>
      {/* Top linear progress during sync */}
      {isLoading && (
        <LinearProgress 
          sx={{ 
            position: 'absolute', 
            top: -32, 
            left: -32, 
            right: -32, 
            height: 4, 
            zIndex: 10 
          }} 
        />
      )}

      {/* Header and Breadcrumbs */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 1 }}>
            <Link underline="hover" color="inherit" href="#" onClick={(e) => { e.preventDefault(); setCurrentView('list'); setActiveTab(0); }}>
              Printopia ERP
            </Link>
            <Typography color="text.primary" sx={{ fontWeight: 'medium' }}>
              Paper Master
            </Typography>
          </Breadcrumbs>
          <Typography variant="h4" color="text.primary" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
            {activeTab === 0
              ? currentView === 'list' ? 'Paper Master Registry' : currentView === 'add' ? 'Register New Paper' : 'Edit Paper Specs'
              : activeTab === 1 ? 'Paper Stock ledger'
              : activeTab === 2 ? 'Paper Sourcing Rate History'
              : activeTab === 3 ? 'Paper Categories master'
              : activeTab === 4 ? 'Parent Sheet size Library'
              : activeTab === 5 ? 'GSM Grammage Library'
              : 'Purchase Unit Master'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {activeTab === 0
              ? 'Configure physical paper dimensions, mill brands, grain directions, compatible GSMs, and trading units.'
              : activeTab === 1 ? 'Monitor and reconcile opening stocks, reserved print-run requirements, and safety reorder trigger lines.'
              : activeTab === 2 ? 'Audit contract supplier price history. Safeguard older estimates with durable historical rates.'
              : 'Configure admin parameters, physical sizing matrices, and operational metadata. Changes reflect globally.'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            id="btn-sync-api-paper"
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<SyncIcon />}
            onClick={fetchAllData}
            disabled={isLoading}
            sx={{ textTransform: 'none', fontWeight: 'bold' }}
          >
            Sync DB
          </Button>
          {currentView !== 'list' && activeTab === 0 && (
            <Button
              id="btn-back-to-registry"
              variant="outlined"
              onClick={() => { setCurrentView('list'); }}
              sx={{ textTransform: 'none', fontWeight: 'bold' }}
            >
              Back to Registry
            </Button>
          )}
        </Box>
      </Box>

      {/* Navigation Tabs for all 9 Pages (Aggregated logically) */}
      {currentView === 'list' && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newVal) => setActiveTab(newVal)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 'bold', fontSize: '0.85rem' },
              '& .Mui-selected': { color: 'primary.main' }
            }}
          >
            <Tab icon={<SettingsIcon fontSize="small" />} iconPosition="start" label="1. Papers Registry" />
            <Tab icon={<StockIcon fontSize="small" />} iconPosition="start" label="2. Paper Stock" />
            <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label="3. Rate History" />
            <Tab icon={<CatIcon fontSize="small" />} iconPosition="start" label="4. Categories master" />
            <Tab icon={<SizeIcon fontSize="small" />} iconPosition="start" label="5. Parent Sheets" />
            <Tab icon={<GSMIcon fontSize="small" />} iconPosition="start" label="6. GSM Library" />
            <Tab icon={<TrendIcon fontSize="small" />} iconPosition="start" label="7. Purchase Units" />
          </Tabs>
        </Box>
      )}

      {/* Stats Cards (Only visible on List Registry / Stock monitors) */}
      {currentView === 'list' && (activeTab === 0 || activeTab === 1) && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    ACTIVE PAPER STYLES
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                    {papers.filter((p) => p.status === 'Active').length} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'normal' }}>/ {papers.length} Models</span>
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(37, 99, 235, 0.1)', color: 'primary.main', borderRadius: 2, display: 'flex' }}>
                  <SettingsIcon />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    OUT OF STOCK
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: stockMetrics.outCount > 0 ? 'error.main' : 'text.primary' }}>
                    {stockMetrics.outCount} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'normal' }}>Paper types</span>
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: stockMetrics.outCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.04)', color: stockMetrics.outCount > 0 ? 'error.main' : 'text.secondary', borderRadius: 2, display: 'flex' }}>
                  <StockIcon />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    CRITICAL SAFETY LOW
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: stockMetrics.lowCount > 0 ? 'error.main' : 'text.primary' }}>
                    {stockMetrics.lowCount} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'normal' }}>Reconcile needed</span>
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: stockMetrics.lowCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: stockMetrics.lowCount > 0 ? 'error.main' : 'success.main', borderRadius: 2, display: 'flex' }}>
                  <TrendIcon />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    HISTORICAL SOURCING LOGS
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'secondary.main' }}>
                    {allRates.length} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'normal' }}>Invoices</span>
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(139, 92, 246, 0.1)', color: 'secondary.main', borderRadius: 2, display: 'flex' }}>
                  <HistoryIcon />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Panel Content router based on active tab & view */}
      <Paper elevation={0} sx={{ border: 'none', background: 'transparent' }}>
        
        {/* Loader Spinner Overlay */}
        {isLoading && papers.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12 }}>
            <CircularProgress color="primary" sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Synchronizing with central Postgres ERP database...
            </Typography>
          </Box>
        ) : (
          <>
            {/* TAB 0: PAPERS REGISTRY */}
            {activeTab === 0 && (
              currentView === 'list' ? (
                <PaperTable
                  papers={papers}
                  categories={categories}
                  gsmList={gsmList}
                  sheetSizes={sheetSizes}
                  purchaseUnits={purchaseUnits}
                  onEdit={handleEditClick}
                  onDelete={handleDeletePaper}
                  onAddClick={handleAddClick}
                  onViewRateHistory={handleViewRateHistoryShortcut}
                  onAdjustStock={handleAdjustStockShortcut}
                  onImportSuccess={handleImportSuccess}
                />
              ) : (
                <PaperForm
                  paper={selectedPaper}
                  categories={categories}
                  gsmList={gsmList}
                  sheetSizes={sheetSizes}
                  purchaseUnits={purchaseUnits}
                  existingPapers={papers}
                  onSave={handleSavePaper}
                  onCancel={() => setCurrentView('list')}
                />
              )
            )}

            {/* TAB 1: PAPER STOCK */}
            {activeTab === 1 && (
              <Box>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Paper Model Details</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Code</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Purchase Unit</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Opening Stock</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Available Stock</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Reserved Stock</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Minimum safety</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Reorder line</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Closing balance</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {papers.map((p) => {
                        const st = p.stock || { openingStock: 0, availableStock: 0, reservedStock: 0, minimumStock: 0, reorderLevel: 0, closingStock: 0 };
                        const unitCode = unitMap.get(p.purchaseUnitId)?.code || 'SHT';
                        const isLow = st.availableStock <= st.minimumStock;
                        return (
                          <TableRow key={p.id} hover>
                            <TableCell sx={{ fontWeight: 'bold' }}>{p.paperName}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{p.paperCode}</TableCell>
                            <TableCell>{unitMap.get(p.purchaseUnitId)?.name || 'Per Sheet'}</TableCell>
                            <TableCell align="right">{st.openingStock.toLocaleString()}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', color: isLow ? 'error.main' : 'success.main' }}>
                              {st.availableStock.toLocaleString()}
                            </TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary' }}>{st.reservedStock.toLocaleString()}</TableCell>
                            <TableCell align="right" sx={{ color: 'error.light' }}>{st.minimumStock.toLocaleString()}</TableCell>
                            <TableCell align="right" sx={{ color: 'warning.light' }}>{st.reorderLevel.toLocaleString()}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                              {(st.availableStock + st.reservedStock).toLocaleString()}
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                startIcon={<EditIcon />}
                                onClick={() => handleOpenStockEdit(p)}
                                sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 'bold' }}
                              >
                                Reconcile
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* TAB 2: RATE HISTORY */}
            {activeTab === 2 && (
              <Box>
                <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
                  <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        Maintain Historical Supplier Sourcing Rates
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Old estimates are bound to historical rate structures. Updating a rate logs a new timeline ledger.
                      </Typography>
                    </Box>
                    <FormControl size="small" sx={{ width: 300 }}>
                      <InputLabel id="rate-add-select-label">Select Paper to log new rate</InputLabel>
                      <Select
                        labelId="rate-add-select-label"
                        label="Select Paper to log new rate"
                        value=""
                        onChange={(e) => {
                          const paperObj = papers.find((p) => p.id === e.target.value);
                          if (paperObj) handleOpenRateEdit(paperObj);
                        }}
                      >
                        {papers.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.paperName} ({p.paperCode})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Paper Sourced</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Paper Code</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Effective Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Purchase Unit</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Contract Rate</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Supplier Entity</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Sourcing Remarks</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>System timestamp</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allRates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                            No rate invoices logged yet. Use the dropdown above to create a sourcing pricing tier.
                          </TableCell>
                        </TableRow>
                      ) : (
                        allRates.map((rate) => {
                          const p = paperMap.get(rate.paperId);
                          const unit = unitMap.get(rate.purchaseUnitId);
                          return (
                            <TableRow key={rate.id} hover>
                              <TableCell sx={{ fontWeight: 'bold' }}>{p?.paperName || 'Deleted Paper Record'}</TableCell>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{p?.paperCode || 'N/A'}</TableCell>
                              <TableCell sx={{ fontWeight: 'medium' }}>{rate.effectiveDate}</TableCell>
                              <TableCell>{unit?.name || 'Per Sheet'}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                Rs. {rate.rate.toFixed(2)}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 'semibold' }}>{rate.supplier}</TableCell>
                              <TableCell sx={{ fontStyle: 'italic', color: 'text.secondary' }}>"{rate.remarks || 'No remarks recorded'}"</TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{new Date(rate.createdAt).toLocaleString()}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* TAB 3: CATEGORIES MASTER */}
            {activeTab === 3 && (
              <Box>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Paper Category Library ({categories.length} Categories)
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setCategoryModal({ open: true, name: '', code: '', description: '' })}
                    sx={{ textTransform: 'none', fontWeight: 'bold' }}
                  >
                    Add Category
                  </Button>
                </Box>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Category Code</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Category Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Technical Description</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {categories.map((cat) => (
                        <TableRow key={cat.id} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{cat.code}</TableCell>
                          <TableCell sx={{ fontWeight: 'semibold' }}>{cat.name}</TableCell>
                          <TableCell>{cat.description || 'No description configured.'}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setCategoryModal({ open: true, id: cat.id, name: cat.name, code: cat.code, description: cat.description || '' })}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteCategory(cat.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* TAB 4: PARENT SHEET LIBRARY */}
            {activeTab === 4 && (
              <Box>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Stock Parent Sheet Sizes ({sheetSizes.length} Sizing Specs)
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setSheetModal({ open: true, name: '', width: 0, height: 0, unit: 'inch' })}
                    sx={{ textTransform: 'none', fontWeight: 'bold' }}
                  >
                    Add Sheet Size
                  </Button>
                </Box>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Sheet Label / Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Width</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Height</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Dimension Unit</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sheetSizes.map((sheet) => (
                        <TableRow key={sheet.id} hover>
                          <TableCell sx={{ fontWeight: 'bold' }}>{sheet.name}</TableCell>
                          <TableCell align="right">{sheet.width}</TableCell>
                          <TableCell align="right">{sheet.height}</TableCell>
                          <TableCell>{sheet.unit === 'inch' ? 'Inches (")' : 'Millimeters (mm)'}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setSheetModal({ open: true, id: sheet.id, name: sheet.name, width: sheet.width, height: sheet.height, unit: sheet.unit })}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteSheet(sheet.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* TAB 5: GSM GRAMMAGE LIBRARY */}
            {activeTab === 5 && (
              <Box>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Configurable Paper GSM Grammages ({gsmList.length} Weight Series)
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setGsmModal({ open: true, gsmValue: 0, description: '' })}
                    sx={{ textTransform: 'none', fontWeight: 'bold' }}
                  >
                    Add GSM Value
                  </Button>
                </Box>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>GSM Grammage (g/m²)</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Weight Description / Standard Press Use</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gsmList.map((gsm) => (
                        <TableRow key={gsm.id} hover>
                          <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>{gsm.gsmValue} GSM</TableCell>
                          <TableCell>{gsm.description || 'Custom Weight specs'}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setGsmModal({ open: true, id: gsm.id, gsmValue: gsm.gsmValue, description: gsm.description || '' })}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteGSM(gsm.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* TAB 6: PURCHASE UNITS MASTER */}
            {activeTab === 6 && (
              <Box>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Trading Purchase Units ({purchaseUnits.length} Units Master)
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setUnitModal({ open: true, name: '', code: '' })}
                    sx={{ textTransform: 'none', fontWeight: 'bold' }}
                  >
                    Add Purchase Unit
                  </Button>
                </Box>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Short Unit Code</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Trading Unit Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {purchaseUnits.map((u) => (
                        <TableRow key={u.id} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{u.code}</TableCell>
                          <TableCell sx={{ fontWeight: 'semibold' }}>{u.name}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setUnitModal({ open: true, id: u.id, name: u.name, code: u.code })}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteUnit(u.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* ==========================================
          MODALS & POPUP CONTROLS
          ========================================== */}

      {/* Reconcile Stock Modal */}
      <Dialog open={Boolean(stockEditPaper)} onClose={() => setStockEditPaper(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <StockIcon color="success" /> Reconcile Stock Quantities
        </DialogTitle>
        {stockEditPaper && (
          <>
            <DialogContent>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Perform inventory correction or stock receipt logging for <b>{stockEditPaper.paperName} ({stockEditPaper.paperCode})</b>.
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    label="Physical Opening Stock"
                    value={stockForm.openingStock}
                    onChange={(e) => setStockForm((prev) => ({ ...prev, openingStock: Number(e.target.value) }))}
                    helperText="Initial stock registered"
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    label="Available Physical Stock"
                    value={stockForm.availableStock}
                    onChange={(e) => setStockForm((prev) => ({ ...prev, availableStock: Number(e.target.value) }))}
                    helperText="Unbound stock on shelves"
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    label="Reserved for Active Jobs"
                    value={stockForm.reservedStock}
                    onChange={(e) => setStockForm((prev) => ({ ...prev, reservedStock: Number(e.target.value) }))}
                    helperText="Allocated to printers"
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    label="Minimum Stock"
                    value={stockForm.minimumStock}
                    onChange={(e) => setStockForm((prev) => ({ ...prev, minimumStock: Number(e.target.value) }))}
                    helperText="Safety margin threshold"
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    label="Reorder Alert Trigger"
                    value={stockForm.reorderLevel}
                    onChange={(e) => setStockForm((prev) => ({ ...prev, reorderLevel: Number(e.target.value) }))}
                    helperText="Procure trigger line"
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={() => setStockEditPaper(null)} variant="outlined">Cancel</Button>
              <Button onClick={handleSaveStock} variant="contained" color="success">Save Balances</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Log Sourcing Rate Modal */}
      <Dialog open={Boolean(rateEditPaper)} onClose={() => setRateEditPaper(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <RateIcon color="primary" /> Register Supplier Sourcing Invoice
        </DialogTitle>
        {rateEditPaper && (
          <>
            <DialogContent>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Record a contract rate update or invoice purchase log for <b>{rateEditPaper.paperName}</b>.
              </Typography>

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Effective Timeline Date"
                    value={rateForm.effectiveDate}
                    onChange={(e) => setRateForm((prev) => ({ ...prev, effectiveDate: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="rate-unit-select-label">Sourced Unit</InputLabel>
                    <Select
                      labelId="rate-unit-select-label"
                      label="Sourced Unit"
                      value={rateForm.purchaseUnitId}
                      onChange={(e) => setRateForm((prev) => ({ ...prev, purchaseUnitId: e.target.value }))}
                    >
                      {purchaseUnits.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.name} ({u.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Contract Trading Rate"
                    value={rateForm.rate}
                    onChange={(e) => setRateForm((prev) => ({ ...prev, rate: Number(e.target.value) }))}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">Rs.</InputAdornment>
                      },
                      htmlInput: { min: 0, step: '0.01' }
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Supplier Entity *"
                    placeholder="e.g. Century Sourcing"
                    value={rateForm.supplier}
                    onChange={(e) => setRateForm((prev) => ({ ...prev, supplier: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    label="Sourcing Log Remarks / Terms"
                    placeholder="e.g. Cash discount pricing, bulk freight included..."
                    value={rateForm.remarks}
                    onChange={(e) => setRateForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={() => setRateEditPaper(null)} variant="outlined">Cancel</Button>
              <Button onClick={handleSaveRateHistory} variant="contained" color="primary">Commit Sourcing Rate</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Category CRUD Modal */}
      <Dialog open={categoryModal.open} onClose={() => setCategoryModal((prev) => ({ ...prev, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {categoryModal.id ? 'Edit Category' : 'Add Category'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Category Name *"
              placeholder="e.g. Maplitho"
              value={categoryModal.name}
              onChange={(e) => setCategoryModal((prev) => ({ ...prev, name: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Short Code *"
              placeholder="e.g. MAP"
              value={categoryModal.code}
              onChange={(e) => setCategoryModal((prev) => ({ ...prev, code: e.target.value }))}
              slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
            />
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Category Description"
              placeholder="Superfine uncoated wove text..."
              value={categoryModal.description}
              onChange={(e) => setCategoryModal((prev) => ({ ...prev, description: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCategoryModal((prev) => ({ ...prev, open: false }))} variant="outlined">Cancel</Button>
          <Button onClick={handleSaveCategory} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Parent Sheet CRUD Modal */}
      <Dialog open={sheetModal.open} onClose={() => setSheetModal((prev) => ({ ...prev, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {sheetModal.id ? 'Edit Parent Sheet Size' : 'Register Parent Sheet Size'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Sizing Label *"
              placeholder="e.g. 23×36"
              value={sheetModal.name}
              onChange={(e) => setSheetModal((prev) => ({ ...prev, name: e.target.value }))}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Width"
                value={sheetModal.width || ''}
                onChange={(e) => setSheetModal((prev) => ({ ...prev, width: Number(e.target.value) }))}
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Height"
                value={sheetModal.height || ''}
                onChange={(e) => setSheetModal((prev) => ({ ...prev, height: Number(e.target.value) }))}
              />
            </Box>
            <FormControl fullWidth size="small">
              <InputLabel id="sheet-unit-label">Unit</InputLabel>
              <Select
                labelId="sheet-unit-label"
                label="Unit"
                value={sheetModal.unit}
                onChange={(e) => setSheetModal((prev) => ({ ...prev, unit: e.target.value as 'inch' | 'mm' }))}
              >
                <MenuItem value="inch">Inches (")</MenuItem>
                <MenuItem value="mm">Millimeters (mm)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setSheetModal((prev) => ({ ...prev, open: false }))} variant="outlined">Cancel</Button>
          <Button onClick={handleSaveSheet} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* GSM CRUD Modal */}
      <Dialog open={gsmModal.open} onClose={() => setGsmModal((prev) => ({ ...prev, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {gsmModal.id ? 'Edit GSM Specification' : 'Register GSM Value'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="GSM Value (g/m²) *"
              value={gsmModal.gsmValue || ''}
              onChange={(e) => setGsmModal((prev) => ({ ...prev, gsmValue: Number(e.target.value) }))}
            />
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Grammage Description"
              placeholder="e.g. Standard offset writing, premium art book cover..."
              value={gsmModal.description}
              onChange={(e) => setGsmModal((prev) => ({ ...prev, description: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setGsmModal((prev) => ({ ...prev, open: false }))} variant="outlined">Cancel</Button>
          <Button onClick={handleSaveGSM} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Purchase Unit CRUD Modal */}
      <Dialog open={unitModal.open} onClose={() => setUnitModal((prev) => ({ ...prev, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {unitModal.id ? 'Edit Trading Unit' : 'Register Trading Purchase Unit'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Trading Unit Name *"
              placeholder="e.g. Per Sheet"
              value={unitModal.name}
              onChange={(e) => setUnitModal((prev) => ({ ...prev, name: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Short Code *"
              placeholder="e.g. SHT"
              value={unitModal.code}
              onChange={(e) => setUnitModal((prev) => ({ ...prev, code: e.target.value }))}
              slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setUnitModal((prev) => ({ ...prev, open: false }))} variant="outlined">Cancel</Button>
          <Button onClick={handleSaveUnit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Toast Alert Feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
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
