/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Card,
  CardContent,
  Divider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Chip,
  IconButton,
  Stack,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Close as RemoveIcon,
  Save as SaveIcon,
  Undo as ResetIcon
} from '@mui/icons-material';
import { ProductMasterItem, ProductCategory, ProductStatus } from '../types';
import { validateProductForm, ProductFormErrors } from '../validation';

interface ProductFormProps {
  initialData?: ProductMasterItem | null;
  categories: ProductCategory[];
  existingProducts: ProductMasterItem[];
  onSave: (product: Omit<ProductMasterItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => void;
  onCancel: () => void;
}

const FINISHING_CATALOG = [
  'Lamination', 'Matt Lamination', 'Gloss Lamination', 'UV', 'Spot UV',
  'Foiling', 'Emboss', 'Deboss', 'Die Cutting', 'Creasing', 'Folding',
  'Pasting', 'Eyelet', 'Punch', 'Binding', 'Padding', 'Numbering', 'Perforation'
];

export default function ProductForm({
  initialData,
  categories,
  existingProducts,
  onSave,
  onCancel
}: ProductFormProps) {
  const isEditMode = Boolean(initialData);

  // --- FORM STATES ---
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<ProductStatus>('Active');
  const [description, setDescription] = useState('');

  // Sizing
  const [openWidth, setOpenWidth] = useState(0);
  const [openHeight, setOpenHeight] = useState(0);
  const [closeWidth, setCloseWidth] = useState(0);
  const [closeHeight, setCloseHeight] = useState(0);
  const [finishedWidth, setFinishedWidth] = useState(0);
  const [finishedHeight, setFinishedHeight] = useState(0);

  // Printing
  const [printSide, setPrintSide] = useState<'Single Side' | 'Both Side' | 'Custom'>('Single Side');
  const [printColors, setPrintColors] = useState<'1 Color' | '2 Color' | '4 Color' | 'Custom Colors'>('1 Color');
  const [customColorsText, setCustomColorsText] = useState('');

  // Paper options list (Configurable)
  const [paperTypes, setPaperTypes] = useState<string[]>([]);
  const [newPaperType, setNewPaperType] = useState('');
  
  const [gsms, setGsms] = useState<number[]>([]);
  const [newGsm, setNewGsm] = useState('');

  const [parentSheets, setParentSheets] = useState<string[]>([]);
  const [newParentSheet, setNewParentSheet] = useState('');

  // Finishing list selectables
  const [selectedFinishing, setSelectedFinishing] = useState<string[]>([]);

  // Special options (Category specific add-ons)
  const [specialOptions, setSpecialOptions] = useState<any>({
    window: false,
    windowSize: '',
    gumming: false,
    punch: false,
    dieRequired: false,
    pocket: false,
    plasticClip: false,
    pocketAndClip: false,
    bondPaper: false,
    maplithoPaper: false,
    padding: false,
    perforation: false,
    numbering: false,
    duplicate: false,
    triplicate: false,
    foldType: '',
    plain: false,
    logoPosition: ''
  });

  // Validation
  const [errors, setErrors] = useState<ProductFormErrors>({});

  // Initialize form with existing item
  useEffect(() => {
    if (initialData) {
      setProductName(initialData.productName);
      setProductCode(initialData.productCode);
      setCategoryId(initialData.categoryId);
      setStatus(initialData.status);
      setDescription(initialData.description || '');

      setOpenWidth(initialData.sizes.openWidth);
      setOpenHeight(initialData.sizes.openHeight);
      setCloseWidth(initialData.sizes.closeWidth);
      setCloseHeight(initialData.sizes.closeHeight);
      setFinishedWidth(initialData.sizes.finishedWidth);
      setFinishedHeight(initialData.sizes.finishedHeight);

      setPrintSide(initialData.printOptions.side);
      setPrintColors(initialData.printOptions.colors);
      setCustomColorsText(initialData.printOptions.customColorsText || '');

      setPaperTypes(initialData.paperOptions.paperTypes);
      setGsms(initialData.paperOptions.gsms);
      setParentSheets(initialData.paperOptions.parentSheets);

      setSelectedFinishing(initialData.finishingOptions);
      setSpecialOptions({
        ...specialOptions,
        ...initialData.specialOptions
      });
    } else {
      // Default placeholder initial specs
      setOpenWidth(11.0);
      setOpenHeight(8.5);
      setCloseWidth(11.0);
      setCloseHeight(8.5);
      setFinishedWidth(11.0);
      setFinishedHeight(8.5);
      setPaperTypes(['Art Paper', 'Maplitho']);
      setGsms([80, 130, 300]);
      setParentSheets(['23x36', '20x30']);
    }
  }, [initialData]);

  // Handle special checkbox options toggles
  const handleSpecialCheckboxChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSpecialOptions((prev: any) => ({
      ...prev,
      [key]: e.target.checked
    }));
  };

  const handleSpecialTextChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSpecialOptions((prev: any) => ({
      ...prev,
      [key]: e.target.value
    }));
  };

  // Tag list mutators
  const addPaperType = () => {
    if (newPaperType.trim() && !paperTypes.includes(newPaperType.trim())) {
      setPaperTypes((prev) => [...prev, newPaperType.trim()]);
      setNewPaperType('');
    }
  };

  const removePaperType = (index: number) => {
    setPaperTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const addGsm = () => {
    const val = parseInt(newGsm);
    if (!isNaN(val) && val > 0 && !gsms.includes(val)) {
      setGsms((prev) => [...prev, val].sort((a, b) => a - b));
      setNewGsm('');
    }
  };

  const removeGsm = (index: number) => {
    setGsms((prev) => prev.filter((_, i) => i !== index));
  };

  const addParentSheet = () => {
    if (newParentSheet.trim() && !parentSheets.includes(newParentSheet.trim())) {
      setParentSheets((prev) => [...prev, newParentSheet.trim()]);
      setNewParentSheet('');
    }
  };

  const removeParentSheet = (index: number) => {
    setParentSheets((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle finishing checkbox
  const handleFinishingToggle = (opt: string) => {
    setSelectedFinishing((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  // Form submit coordinator
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const currentDataToValidate: Partial<ProductMasterItem> = {
      productName,
      productCode,
      categoryId,
      sizes: {
        openWidth,
        openHeight,
        closeWidth,
        closeHeight,
        finishedWidth,
        finishedHeight
      },
      paperOptions: {
        paperTypes,
        gsms,
        parentSheets
      }
    };

    const formErrors = validateProductForm(
      currentDataToValidate,
      existingProducts,
      isEditMode,
      initialData?.id
    );

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrors({});

    // Prep special options payload (filter out empty strings)
    const filteredSpecial: any = {};
    Object.entries(specialOptions).forEach(([key, value]) => {
      if (value !== false && value !== '') {
        filteredSpecial[key] = value;
      }
    });

    onSave({
      productName: productName.trim(),
      productCode: productCode.trim().toUpperCase(),
      categoryId,
      status,
      description: description.trim(),
      sizes: {
        openWidth,
        openHeight,
        closeWidth,
        closeHeight,
        finishedWidth,
        finishedHeight
      },
      printOptions: {
        side: printSide,
        colors: printColors,
        customColorsText: printColors === 'Custom Colors' ? customColorsText : undefined
      },
      paperOptions: {
        paperTypes,
        gsms,
        parentSheets
      },
      specialOptions: filteredSpecial,
      finishingOptions: selectedFinishing
    });
  };

  // Detect and guess special options based on chosen product name keywords (Autocomplete help!)
  useEffect(() => {
    if (!isEditMode && productName) {
      const lower = productName.toLowerCase();
      if (lower.includes('envelope')) {
        setSpecialOptions((prev: any) => ({ ...prev, dieRequired: true, gumming: true, window: lower.includes('window') }));
      } else if (lower.includes('file') || lower.includes('folder')) {
        setSpecialOptions((prev: any) => ({ ...prev, pocket: true, plasticClip: true, pocketAndClip: true, dieRequired: true }));
      } else if (lower.includes('pad')) {
        setSpecialOptions((prev: any) => ({ ...prev, bondPaper: true, padding: true, numbering: true }));
      } else if (lower.includes('book') || lower.includes('memo') || lower.includes('bill')) {
        setSpecialOptions((prev: any) => ({ ...prev, duplicate: true, numbering: true, perforation: true }));
      } else if (lower.includes('flyer')) {
        setSpecialOptions((prev: any) => ({ ...prev, foldType: 'Bi-Fold' }));
      } else if (lower.includes('letterhead')) {
        setSpecialOptions((prev: any) => ({ ...prev, plain: true, logoPosition: 'Top Left' }));
      }
    }
  }, [productName]);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      {Object.keys(errors).length > 0 && (
        <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Please correct the validation errors below before registering this template:
          </Typography>
          <ul>
            {Object.values(errors).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Left Column: Specifications & Identity */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Section 1: Core Identity */}
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                1. Core Product Identity
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    fullWidth
                    label="Product Name *"
                    placeholder="e.g. Patient Prescription Pad, Corporate Envelope"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    error={Boolean(errors.productName)}
                    helperText={errors.productName || 'Administrative name of this product template'}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Product Code *"
                    placeholder="e.g. PRD-HOS-RX"
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value)}
                    error={Boolean(errors.productCode)}
                    helperText={errors.productCode || 'Unique alphanumeric code'}
                    slotProps={{ htmlInput: { style: { textTransform: 'uppercase', fontFamily: 'monospace' } } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth error={Boolean(errors.categoryId)}>
                    <InputLabel id="category-select-label">Product Category *</InputLabel>
                    <Select
                      labelId="category-select-label"
                      label="Product Category *"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      {categories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>
                          {cat.name} ({cat.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="status-select-label">Operational Status</InputLabel>
                    <Select
                      labelId="status-select-label"
                      label="Operational Status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ProductStatus)}
                    >
                      <MenuItem value="Active">Active / Template Usable</MenuItem>
                      <MenuItem value="Inactive">Inactive / Suspended</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Description & Production Directives"
                    placeholder="Explain layout parameters, printing guidelines, paper cutting specifications for staff."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Section 2: Physical Sizes (All Editable) */}
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                2. Physical Size Parameters (Inches)
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Open Flat Width (Inches) *"
                    value={openWidth || ''}
                    onChange={(e) => setOpenWidth(Number(e.target.value))}
                    error={Boolean(errors.openWidth)}
                    helperText={errors.openWidth || 'Before folding/trimming'}
                    slotProps={{ htmlInput: { step: '0.01', min: '0.1' } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Open Flat Height (Inches) *"
                    value={openHeight || ''}
                    onChange={(e) => setOpenHeight(Number(e.target.value))}
                    error={Boolean(errors.openHeight)}
                    helperText={errors.openHeight}
                    slotProps={{ htmlInput: { step: '0.01', min: '0.1' } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Close Folded Width (Inches) *"
                    value={closeWidth || ''}
                    onChange={(e) => setCloseWidth(Number(e.target.value))}
                    error={Boolean(errors.closeWidth)}
                    helperText={errors.closeWidth || 'After folding/creasing'}
                    slotProps={{ htmlInput: { step: '0.01', min: '0.1' } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Close Folded Height (Inches) *"
                    value={closeHeight || ''}
                    onChange={(e) => setCloseHeight(Number(e.target.value))}
                    error={Boolean(errors.closeHeight)}
                    helperText={errors.closeHeight}
                    slotProps={{ htmlInput: { step: '0.01', min: '0.1' } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Finished Trimmed Width *"
                    value={finishedWidth || ''}
                    onChange={(e) => setFinishedWidth(Number(e.target.value))}
                    error={Boolean(errors.finishedWidth)}
                    helperText={errors.finishedWidth || 'Final delivered margin'}
                    slotProps={{ htmlInput: { step: '0.01', min: '0.1' } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Finished Trimmed Height *"
                    value={finishedHeight || ''}
                    onChange={(e) => setFinishedHeight(Number(e.target.value))}
                    error={Boolean(errors.finishedHeight)}
                    helperText={errors.finishedHeight}
                    slotProps={{ htmlInput: { step: '0.01', min: '0.1' } }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Section 3: Custom Print Colors & Sides */}
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                3. Print Colors & Machine Pass Specifications
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="side-select-label">Printing Side Orientation</InputLabel>
                    <Select
                      labelId="side-select-label"
                      label="Printing Side Orientation"
                      value={printSide}
                      onChange={(e) => setPrintSide(e.target.value as any)}
                    >
                      <MenuItem value="Single Side">Single Side (Front Only)</MenuItem>
                      <MenuItem value="Both Side">Both Side (Back-to-Back)</MenuItem>
                      <MenuItem value="Custom">Custom Orientation Spec</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="colors-select-label">Primary Color Config</InputLabel>
                    <Select
                      labelId="colors-select-label"
                      label="Primary Color Config"
                      value={printColors}
                      onChange={(e) => setPrintColors(e.target.value as any)}
                    >
                      <MenuItem value="1 Color">1 Color (Monochrome Standard)</MenuItem>
                      <MenuItem value="2 Color">2 Color (Spot Color Printing)</MenuItem>
                      <MenuItem value="4 Color">4 Color (Full Process CMYK)</MenuItem>
                      <MenuItem value="Custom Colors">Custom Spot Colors / Pantones</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {printColors === 'Custom Colors' && (
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Specify Custom Spot Pantone / Ink Colors"
                      placeholder="e.g. Pantone 286C Blue + Metallic Silver"
                      value={customColorsText}
                      onChange={(e) => setCustomColorsText(e.target.value)}
                      helperText="Specify the special Pantone numbers or spot colors required for estimates."
                    />
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Section 4: Dynamic Special Product Add-ons */}
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  4. Category-Specific Add-ons
                </Typography>
                <Chip label="Contextual Settings" size="small" color="primary" variant="outlined" />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                Configure parameters unique to folders, medical envelopes, triplicate carbonless invoices, corporate brochures, or pad layouts.
              </Typography>

              <Grid container spacing={3}>
                {/* Envelopes (Lab or Medical) */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      🖆 Envelopes & Packaging Spec (Lab, Medical or X-Ray)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <FormControlLabel
                          control={<Checkbox checked={specialOptions.window || false} onChange={handleSpecialCheckboxChange('window')} />}
                          label="With Window"
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 4 }}>
                        <TextField
                          size="small"
                          fullWidth
                          disabled={!specialOptions.window}
                          label="Window Size/Pos"
                          placeholder="e.g. 3.5×1.5 inch"
                          value={specialOptions.windowSize || ''}
                          onChange={handleSpecialTextChange('windowSize')}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 2.5 }}>
                        <FormControlLabel
                          control={<Checkbox checked={specialOptions.gumming || false} onChange={handleSpecialCheckboxChange('gumming')} />}
                          label="Flap Gumming"
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 2.5 }}>
                        <FormControlLabel
                          control={<Checkbox checked={specialOptions.dieRequired || false} onChange={handleSpecialCheckboxChange('dieRequired')} />}
                          label="Die-Cut Required"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>

                {/* Files & Folders (OPD File Folders, Corporate Dossiers) */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      📂 Folders & Medical File Cardboards (OPD File / Custom)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 4 }}>
                        <FormControlLabel
                          control={<Checkbox checked={specialOptions.pocket || false} onChange={handleSpecialCheckboxChange('pocket')} />}
                          label="Inner Pocket Glued"
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 4 }}>
                        <FormControlLabel
                          control={<Checkbox checked={specialOptions.plasticClip || false} onChange={handleSpecialCheckboxChange('plasticClip')} />}
                          label="With Plastic/Steel Clip"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <FormControlLabel
                          control={<Checkbox checked={specialOptions.pocketAndClip || false} onChange={handleSpecialCheckboxChange('pocketAndClip')} />}
                          label="Pocket + Clip Combo"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>

                {/* Pads & Invoices (Report Pad, Prescription Pad, Bill Books) */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      📒 Pad Binding & Carbonless Bill Books (Report Pad / Bill Book)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <FormControlLabel
                          control={<Checkbox checked={specialOptions.padding || false} onChange={handleSpecialCheckboxChange('padding')} />}
                          label="Pad Binding Glue"
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <FormControlLabel
                          control={<Checkbox checked={specialOptions.perforation || false} onChange={handleSpecialCheckboxChange('perforation')} />}
                          label="Perforation Line"
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <FormControlLabel
                          control={<Checkbox checked={specialOptions.numbering || false} onChange={handleSpecialCheckboxChange('numbering')} />}
                          label="Serial Numbering"
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <FormControlLabel
                          control={<Checkbox checked={specialOptions.duplicate || false} onChange={handleSpecialCheckboxChange('duplicate')} />}
                          label="Duplicate Copy"
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <FormControlLabel
                          control={<Checkbox checked={specialOptions.triplicate || false} onChange={handleSpecialCheckboxChange('triplicate')} />}
                          label="Triplicate Copy"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>

                {/* Flyers & Brochures (Tri-fold fold types) */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                      📄 Fold Types (Flyer, Brochure)
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      label="Fold Type Configuration"
                      placeholder="e.g. Tri-Fold, Bi-Fold, Z-Fold, Accordion"
                      value={specialOptions.foldType || ''}
                      onChange={handleSpecialTextChange('foldType')}
                    />
                  </Box>
                </Grid>

                {/* Letterheads (Branding & logo margins) */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                      🗉 Corporate Letterhead Details
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 12 }}>
                        <FormControlLabel
                          control={<Checkbox checked={specialOptions.plain || false} onChange={handleSpecialCheckboxChange('plain')} />}
                          label="Plain Corporate Paper"
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          size="small"
                          fullWidth
                          label="Branded Logo Position"
                          placeholder="e.g. Top-Left Margin"
                          value={specialOptions.logoPosition || ''}
                          onChange={handleSpecialTextChange('logoPosition')}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Multi-Value configurations & Finishing Checklists */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            
            {/* Paper Configurations */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
                  Paper Capacities
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                  Supported raw materials for estimates. "No default papers are hardcoded."
                </Typography>

                {/* A. Paper Types */}
                <Box sx={{ mb: 3.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Allowed Paper Types *
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      size="small"
                      placeholder="e.g. Art Paper"
                      value={newPaperType}
                      onChange={(e) => setNewPaperType(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPaperType())}
                    />
                    <Button variant="contained" size="small" onClick={addPaperType} sx={{ minWidth: 40 }}>
                      Add
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {paperTypes.map((type, i) => (
                      <Chip
                        key={i}
                        label={type}
                        size="small"
                        onDelete={() => removePaperType(i)}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                    {paperTypes.length === 0 && (
                      <Typography variant="caption" color="error">
                        At least one paper type required!
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* B. Allowed GSMs */}
                <Box sx={{ mb: 3.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Allowed GSMs *
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      size="small"
                      type="number"
                      placeholder="e.g. 130"
                      value={newGsm}
                      onChange={(e) => setNewGsm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGsm())}
                    />
                    <Button variant="contained" size="small" onClick={addGsm} sx={{ minWidth: 40 }}>
                      Add
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {gsms.map((gsm, i) => (
                      <Chip
                        key={i}
                        label={`${gsm} GSM`}
                        size="small"
                        onDelete={() => removeGsm(i)}
                        color="secondary"
                        variant="outlined"
                      />
                    ))}
                    {gsms.length === 0 && (
                      <Typography variant="caption" color="error">
                        At least one GSM value required!
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* C. Parent Sheet Sizes */}
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Supported Parent Sheets *
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      size="small"
                      placeholder="e.g. 23x36"
                      value={newParentSheet}
                      onChange={(e) => setNewParentSheet(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParentSheet())}
                    />
                    <Button variant="contained" size="small" onClick={addParentSheet} sx={{ minWidth: 40 }}>
                      Add
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {parentSheets.map((size, i) => (
                      <Chip
                        key={i}
                        label={`${size}"`}
                        size="small"
                        onDelete={() => removeParentSheet(i)}
                        color="default"
                        variant="outlined"
                      />
                    ))}
                    {parentSheets.length === 0 && (
                      <Typography variant="caption" color="error">
                        At least one parent sheet size required!
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Finishing Options Checklist */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                  Post-Press Finishing
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                  Select post-press capabilities that estimating algorithms will look for on routing.
                </Typography>

                <FormGroup sx={{ maxHeight: 380, overflowY: 'auto', pr: 1 }}>
                  {FINISHING_CATALOG.map((opt) => (
                    <FormControlLabel
                      key={opt}
                      control={
                        <Checkbox
                          checked={selectedFinishing.includes(opt)}
                          onChange={() => handleFinishingToggle(opt)}
                          color="success"
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontWeight: selectedFinishing.includes(opt) ? 'bold' : 'normal' }}>
                          {opt}
                        </Typography>
                      }
                    />
                  ))}
                </FormGroup>
              </CardContent>
            </Card>

            {/* Form actions panel */}
            <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: 'action.hover' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Apply Template Changes
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="inherit"
                    onClick={onCancel}
                    startIcon={<ResetIcon />}
                    sx={{ fontWeight: 'bold' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    sx={{ fontWeight: 'bold' }}
                  >
                    Save Config
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
