/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  Box,
  Collapse,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
  Tooltip,
  Menu,
  MenuItem,
  Stack
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Print as PrintIcon,
  Layers as LayersIcon,
  Description as SpecIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Download as ExportIcon,
  Upload as ImportIcon,
  Visibility as ViewIcon,
  Construction as SpecialIcon
} from '@mui/icons-material';
import { ProductMasterItem, ProductCategory } from '../types';

interface ProductTableProps {
  products: ProductMasterItem[];
  categories: ProductCategory[];
  onEdit: (product: ProductMasterItem) => void;
  onDelete: (id: string) => void;
  onImport: (importedData: any) => void;
}

// Sub-component for an expandable row
function Row({
  product,
  categoryName,
  onEdit,
  onDelete
}: {
  product: ProductMasterItem;
  categoryName: string;
  onEdit: (p: ProductMasterItem) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell width="50px">
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            {product.productName}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'primary.main' }}>
            {product.productCode}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={categoryName}
            size="small"
            color="secondary"
            variant="outlined"
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary">
            {product.sizes.finishedWidth}" × {product.sizes.finishedHeight}"
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {product.printOptions.colors} ({product.printOptions.side})
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            icon={product.status === 'Active' ? <ActiveIcon /> : <InactiveIcon />}
            label={product.status}
            size="small"
            color={product.status === 'Active' ? 'success' : 'default'}
            sx={{ fontWeight: 'bold' }}
          />
        </TableCell>
        <TableCell align="right">
          <Tooltip title="Edit Product Template Configuration">
            <IconButton onClick={() => onEdit(product)} color="primary" size="small" sx={{ mr: 1 }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Product Template">
            <IconButton onClick={() => onDelete(product.id)} color="error" size="small">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>

      {/* Expanded Row Detail Panels */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2, pb: 2 }}>
              <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 800, fontSize: '0.95rem', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SpecIcon fontSize="small" color="primary" /> Template Specifications & Technical Directives
              </Typography>
              
              <Grid container spacing={3}>
                {/* 1. Layout & Dimensions */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                        <PrintIcon fontSize="small" /> Dimension Tolerances
                      </Typography>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">Open Size (Flat):</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{product.sizes.openWidth}" × {product.sizes.openHeight}"</Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">Close Size (Folded):</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{product.sizes.closeWidth}" × {product.sizes.closeHeight}"</Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">Finished/Trimmed Size:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{product.sizes.finishedWidth}" × {product.sizes.finishedHeight}"</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* 2. Paper & GSM Configuration */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'secondary.main', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                        <LayersIcon fontSize="small" /> Allowed Paper Stock
                      </Typography>
                      <Stack spacing={1}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Paper Types:</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {product.paperOptions.paperTypes.map((type, i) => (
                              <Chip key={i} label={type} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                            ))}
                          </Box>
                        </Box>
                        <Divider />
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>GSM Range Capacity:</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {product.paperOptions.gsms.map((gsm, i) => (
                              <Chip key={i} label={`${gsm} GSM`} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                            ))}
                          </Box>
                        </Box>
                        <Divider />
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Supported Parent Sheets:</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {product.paperOptions.parentSheets.map((size, i) => (
                              <Chip key={i} label={`${size}"`} size="small" color="secondary" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                            ))}
                          </Box>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* 3. Finishing & Special Processing */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'success.main', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                        <SpecialIcon fontSize="small" /> Finishing & Special Features
                      </Typography>
                      <Stack spacing={1}>
                        {product.finishingOptions.length > 0 ? (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Selectable Finishing:</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {product.finishingOptions.map((opt, i) => (
                                <Chip key={i} label={opt} size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                              ))}
                            </Box>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">No post-press finishing configured.</Typography>
                        )}
                        
                        {Object.keys(product.specialOptions).length > 0 && (
                          <>
                            <Divider />
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Special Category Options:</Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {Object.entries(product.specialOptions)
                                  .filter(([_, value]) => value !== false && value !== undefined && value !== '')
                                  .map(([key, value]) => {
                                    const formattedKey = key
                                      .replace(/([A-Z])/g, ' $1')
                                      .trim()
                                      .replace(/^\w/, (c) => c.toUpperCase());
                                    const displayValue = typeof value === 'boolean' ? formattedKey : `${formattedKey}: ${value}`;
                                    return (
                                      <Chip key={key} label={displayValue} size="small" color="warning" sx={{ height: 20, fontSize: '0.7rem' }} />
                                    );
                                  })}
                              </Box>
                            </Box>
                          </>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {product.description && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>Administrative/Production Description:</Typography>
                  <Typography variant="body2" color="text.primary">{product.description}</Typography>
                </Box>
              )}

              <Box sx={{ mt: 1.5, display: 'flex', gap: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Created: <strong>{new Date(product.createdAt).toLocaleDateString()}</strong> by {product.createdBy}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Last Updated: <strong>{new Date(product.updatedAt).toLocaleDateString()}</strong> by {product.updatedBy}
                </Typography>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function ProductTable({
  products,
  categories,
  onEdit,
  onDelete,
  onImport
}: ProductTableProps) {
  // Export Menu state
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setExportAnchorEl(event.currentTarget);
  };
  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const exportCSV = () => {
    const headers = [
      'Product Name',
      'Product Code',
      'Category Code',
      'Status',
      'Finished Size',
      'Print Colors',
      'Printing Side',
      'Paper Types',
      'Finishing Options',
      'Created At'
    ];

    const rows = products.map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId)?.code || '';
      return [
        p.productName,
        p.productCode,
        cat,
        p.status,
        `${p.sizes.finishedWidth}x${p.sizes.finishedHeight}`,
        p.printOptions.colors,
        p.printOptions.side,
        p.paperOptions.paperTypes.join('; '),
        p.finishingOptions.join('; '),
        p.createdAt
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `printopia_product_templates_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    handleExportClose();
  };

  const exportJSON = () => {
    const jsonStr = JSON.stringify(products, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `printopia_product_templates_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    handleExportClose();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
      fileReader.readAsText(event.target.files[0], 'UTF-8');
      fileReader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          onImport(parsed);
        } catch (err) {
          alert('Invalid JSON template file. Please upload a valid exported product backup.');
        }
      };
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {products.length} Registered Product Templates found
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {/* Import Button */}
          <Button
            variant="outlined"
            size="small"
            component="label"
            startIcon={<ImportIcon />}
            sx={{ fontWeight: 'bold' }}
          >
            Import Backup
            <input
              type="file"
              accept=".json"
              hidden
              onChange={handleImportFile}
            />
          </Button>

          {/* Export Button */}
          <Button
            variant="outlined"
            size="small"
            onClick={handleExportClick}
            startIcon={<ExportIcon />}
            sx={{ fontWeight: 'bold' }}
          >
            Export Templates
          </Button>
          <Menu
            anchorEl={exportAnchorEl}
            open={Boolean(exportAnchorEl)}
            onClose={handleExportClose}
          >
            <MenuItem onClick={exportCSV}>Export as CSV (Spreadsheet)</MenuItem>
            <MenuItem onClick={exportJSON}>Export as JSON (Backup)</MenuItem>
          </Menu>
        </Box>
      </Box>

      {products.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No Product Templates Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxW: 500, mx: 'auto' }}>
            Modify filters above or click "Add New Product" or "Load Default Product Presets" to populate the active administrative register.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Table aria-label="product master table">
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell width="50px" />
                <TableCell sx={{ fontWeight: 'bold' }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Finished Size</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Default Colors (Side)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => {
                const category = categories.find((c) => c.id === product.categoryId);
                return (
                  <Row
                    key={product.id}
                    product={product}
                    categoryName={category ? category.name : 'Unknown Category'}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
