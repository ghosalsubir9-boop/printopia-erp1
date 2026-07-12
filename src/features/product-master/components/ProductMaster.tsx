/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Card,
  CardContent,
  Grid,
  Breadcrumbs,
  Link,
  Chip,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Cached as SyncIcon,
  Category as CategoryIcon,
  LibraryBooks as TemplateIcon,
  Code as CodeIcon,
  SettingsBackupRestore as ResetIcon,
  Terminal as TerminalIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { ProductMasterItem, ProductCategory, ProductTemplate, PostgreSQLSchema } from '../types';
import { ProductApiService } from '../services/api';
import ProductTable from './ProductTable';
import ProductForm from './ProductForm';
import CategoryDialog from './CategoryDialog';
import TemplateConfigDialog from './TemplateConfigDialog';

export default function ProductMaster() {
  // Navigation states
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [editingProduct, setEditingProduct] = useState<ProductMasterItem | null>(null);

  // Core Data
  const [products, setProducts] = useState<ProductMasterItem[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPaperType, setFilterPaperType] = useState('All');
  const [filterFinishing, setFilterFinishing] = useState('All');

  // Dialog Toggles
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [schemaDialogOpen, setSchemaDialogOpen] = useState(false);

  // Collected dynamic filter options from registered product list
  const [uniquePaperTypes, setUniquePaperTypes] = useState<string[]>([]);
  const [uniqueFinishing, setUniqueFinishing] = useState<string[]>([]);

  // Load and fetch initial states
  const loadData = async () => {
    setLoading(true);
    try {
      const prodList = await ProductApiService.getProducts();
      const catList = await ProductApiService.getCategories();
      const tempList = await ProductApiService.getTemplates();
      
      setProducts(prodList);
      setCategories(catList);
      setTemplates(tempList);

      // Compute dynamic options for filters
      const papers = new Set<string>();
      const finishing = new Set<string>();
      prodList.forEach((p) => {
        p.paperOptions.paperTypes.forEach((pt) => papers.add(pt));
        p.finishingOptions.forEach((f) => finishing.add(f));
      });
      setUniquePaperTypes(Array.from(papers));
      setUniqueFinishing(Array.from(finishing));
    } catch (err: any) {
      setErrorMsg('Failed to load Product Master records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter application helper
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = filterCategory === 'All' || p.categoryId === filterCategory;
    const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
    const matchesPaper = filterPaperType === 'All' || p.paperOptions.paperTypes.includes(filterPaperType);
    const matchesFinishing = filterFinishing === 'All' || p.finishingOptions.includes(filterFinishing);

    return matchesSearch && matchesCategory && matchesStatus && matchesPaper && matchesFinishing;
  });

  // Action: Add / Update Product
  const handleSaveProduct = async (formData: any) => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      if (view === 'edit' && editingProduct) {
        await ProductApiService.updateProduct(editingProduct.id, formData);
        setSuccessMsg(`Product '${formData.productName}' template updated successfully.`);
      } else {
        await ProductApiService.createProduct(formData);
        setSuccessMsg(`Product '${formData.productName}' template registered successfully.`);
      }
      setView('list');
      setEditingProduct(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save product specification.');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product template specification? This will remove the routing configurations.')) {
      setActionLoading(true);
      setErrorMsg(null);
      try {
        await ProductApiService.deleteProduct(id);
        setSuccessMsg('Product template deleted successfully.');
        await loadData();
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to delete product.');
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Action: Import Template
  const handleImportBackup = async (importedData: any) => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      // Direct imports mapping/insert
      const importList = Array.isArray(importedData) ? importedData : [importedData];
      let importCount = 0;
      
      for (const item of importList) {
        try {
          await ProductApiService.createProduct(item);
          importCount++;
        } catch (e) {
          // Ignore duplicates during bulk import
        }
      }
      setSuccessMsg(`Successfully imported ${importCount} product template configurations.`);
      await loadData();
    } catch (err: any) {
      setErrorMsg('Failed to process backup file. Verify scheme structure.');
    } finally {
      setActionLoading(false);
    }
  };

  // Category CRUD wrappers
  const handleAddCategory = async (name: string, code: string, desc?: string) => {
    const newCat = await ProductApiService.createCategory(name, code, desc);
    await loadData();
    return newCat;
  };

  const handleUpdateCategory = async (id: string, name: string, code: string, desc?: string) => {
    const updated = await ProductApiService.updateCategory(id, { name, code, description: desc });
    await loadData();
    return updated;
  };

  const handleDeleteCategory = async (id: string) => {
    const success = await ProductApiService.deleteCategory(id);
    await loadData();
    return success;
  };

  // Spawn Product from Template preset
  const handleSpawnTemplate = (temp: ProductTemplate) => {
    setEditingProduct({
      id: '',
      productName: `New ${temp.templateName}`,
      productCode: `PRD-${Date.now().toString().slice(-4)}`,
      categoryId: temp.categoryId,
      status: 'Active',
      description: `Instantiated from ${temp.templateName} preset.`,
      sizes: temp.defaultSizes,
      printOptions: temp.defaultPrintOptions,
      paperOptions: temp.defaultPaperOptions,
      specialOptions: temp.defaultSpecialOptions,
      finishingOptions: temp.defaultFinishingOptions,
      createdAt: '',
      updatedAt: '',
      createdBy: '',
      updatedBy: ''
    });
    setTemplateDialogOpen(false);
    setView('add');
  };

  const handleDeleteTemplate = async (id: string) => {
    await ProductApiService.deleteTemplate(id);
    await loadData();
  };

  // Seed / Reset Database to Default
  const handleSeedDefaults = async () => {
    if (confirm('This will seed the initial product master and default categories. Do you want to proceed?')) {
      setActionLoading(true);
      try {
        localStorage.removeItem('printopia_product_master');
        localStorage.removeItem('printopia_product_categories');
        localStorage.removeItem('printopia_product_templates');
        setSuccessMsg('Product registry resynchronized to enterprise seed defaults.');
        await loadData();
      } catch (err) {
        setErrorMsg('Sync reset failed.');
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Copy Schema SQL helper
  const copySchemaToClipboard = (ddl: string) => {
    navigator.clipboard.writeText(ddl);
    alert('PostgreSQL DDL schema copied to clipboard!');
  };

  return (
    <Box>
      {/* Dynamic Floating Action Feedback Alerts */}
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ mb: 3, borderRadius: 2 }}>
          {successMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 3, borderRadius: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {/* Main Page Layout / Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 0.5 }}>
            <Link underline="hover" color="inherit" href="#" onClick={() => setView('list')}>
              Printopia ERP
            </Link>
            <Typography color="text.primary" sx={{ fontWeight: 'bold' }}>Product Master</Typography>
          </Breadcrumbs>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 1 }}>
            📦 Product Template Master (Module-03)
          </Typography>
        </Box>

        {/* Global Nav Admin Action Panel */}
        {view === 'list' && (
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<ResetIcon />}
              onClick={handleSeedDefaults}
              sx={{ fontWeight: 'bold' }}
            >
              Seed Defaults
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CategoryIcon />}
              onClick={() => setCategoryDialogOpen(true)}
              sx={{ fontWeight: 'bold' }}
            >
              Manage Categories
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<TemplateIcon />}
              onClick={() => setTemplateDialogOpen(true)}
              sx={{ fontWeight: 'bold' }}
            >
              Template Presets
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingProduct(null);
                setView('add');
              }}
              sx={{ fontWeight: 'bold' }}
            >
              Add New Product
            </Button>
            <Button
              variant="outlined"
              color="success"
              startIcon={<CodeIcon />}
              onClick={() => setSchemaDialogOpen(true)}
              sx={{ fontWeight: 'bold' }}
            >
              SQL DDL Schema
            </Button>
          </Box>
        )}
      </Box>

      {/* 1. LIST VIEW */}
      {view === 'list' && (
        <Box>
          {/* Advanced Multi-Criteria Filter Card */}
          <Card variant="outlined" sx={{ mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <FilterIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  Filter Registry & Specifications (Non-Hardcoded Dynamic Binding)
                </Typography>
              </Box>

              <Grid container spacing={2}>
                {/* Search query */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by Product Name, Code, Remarks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: <SearchIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                      }
                    }}
                  />
                </Grid>

                {/* Categories filter */}
                <Grid size={{ xs: 12, sm: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="filter-category-label">Category</InputLabel>
                    <Select
                      labelId="filter-category-label"
                      label="Category"
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                    >
                      <MenuItem value="All">All Categories</MenuItem>
                      {categories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Status filter */}
                <Grid size={{ xs: 12, sm: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="filter-status-label">Status</InputLabel>
                    <Select
                      labelId="filter-status-label"
                      label="Status"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <MenuItem value="All">All Statuses</MenuItem>
                      <MenuItem value="Active">Active Only</MenuItem>
                      <MenuItem value="Inactive">Inactive Only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Paper Types dynamically loaded */}
                <Grid size={{ xs: 12, sm: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="filter-paper-label">Paper Capacity</InputLabel>
                    <Select
                      labelId="filter-paper-label"
                      label="Paper Capacity"
                      value={filterPaperType}
                      onChange={(e) => setFilterPaperType(e.target.value)}
                    >
                      <MenuItem value="All">All Paper Types</MenuItem>
                      {uniquePaperTypes.map((type, i) => (
                        <MenuItem key={i} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Post press finishing options dynamically loaded */}
                <Grid size={{ xs: 12, sm: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="filter-finishing-label">Required Finishing</InputLabel>
                    <Select
                      labelId="filter-finishing-label"
                      label="Required Finishing"
                      value={filterFinishing}
                      onChange={(e) => setFilterFinishing(e.target.value)}
                    >
                      <MenuItem value="All">All Finishing</MenuItem>
                      {uniqueFinishing.map((opt, i) => (
                        <MenuItem key={i} value={opt}>
                          {opt}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Loading Indicator */}
          {loading || actionLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : (
            <ProductTable
              products={filteredProducts}
              categories={categories}
              onEdit={(p) => {
                setEditingProduct(p);
                setView('edit');
              }}
              onDelete={handleDeleteProduct}
              onImport={handleImportBackup}
            />
          )}
        </Box>
      )}

      {/* 2. ADD / EDIT VIEW */}
      {(view === 'add' || view === 'edit') && (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {view === 'edit' ? `Editing: ${editingProduct?.productName} Specification` : 'Configure New Product Template'}
            </Typography>
            <Chip
              label={view === 'edit' ? 'Draft Mode' : 'New Template'}
              color={view === 'edit' ? 'warning' : 'info'}
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          </Box>

          <ProductForm
            initialData={editingProduct}
            categories={categories}
            existingProducts={products}
            onCancel={() => {
              setView('list');
              setEditingProduct(null);
            }}
            onSave={handleSaveProduct}
          />
        </Box>
      )}

      {/* DIALOGS */}

      {/* A. Product Category dialog */}
      <CategoryDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        categories={categories}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* B. Product Template config dialog */}
      <TemplateConfigDialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        templates={templates}
        categories={categories}
        onSpawn={handleSpawnTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />

      {/* C. SQL Schema dialogue (PostgreSQL Preparation) */}
      <Dialog
        open={schemaDialogOpen}
        onClose={() => setSchemaDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TerminalIcon color="success" /> PostgreSQL Relational Schema (Production DDL)
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
            Review the relational model mapped out for this <strong>Printopia ERP Product Master</strong>. These precise tables reflect our active TypeScript interfaces, ensuring type-safe relational integration.
          </Typography>

          <Stack spacing={3}>
            {ProductApiService.getPostgreSQLSchema().map((schema) => (
              <Box key={schema.tableName} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                    Table: {schema.tableName}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CopyIcon />}
                    onClick={() => copySchemaToClipboard(schema.ddl)}
                  >
                    Copy DDL
                  </Button>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#1e293b', color: '#f1f5f9', overflowX: 'auto' }}>
                  <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {schema.ddl}
                  </pre>
                </Box>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSchemaDialogOpen(false)} variant="contained" color="inherit">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
