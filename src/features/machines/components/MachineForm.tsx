/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Paper,
  Alert,
  FormHelperText,
  SelectChangeEvent,
  Checkbox,
  ListItemText,
  OutlinedInput,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as SpeedIcon,
  SquareFoot as SizeIcon,
  Build as BuildIcon,
  Business as BusinessIcon,
  AutoAwesome as SparkIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { MachineMasterItem, PrintingMethod, MachineStatus, SheetMappingItem } from '../types';
import { validateMachine, ValidationErrorMap } from '../validation/machineValidator';

interface MachineFormProps {
  machine: MachineMasterItem | null;
  onSave: (machine: MachineMasterItem) => void;
  onCancel: () => void;
  existingMachines: MachineMasterItem[];
}

const MACHINE_TYPES = [
  'Offset',
  'Digital',
  'Flexo',
  'Screen',
  'Gravure',
  'Letterpress',
  'Finishing / Bindery'
];

const PRINTING_METHODS: PrintingMethod[] = [
  'Sheetwise',
  'Work & Turn',
  'Work & Tumble',
  'Perfecting'
];

export default function MachineForm({
  machine,
  onSave,
  onCancel,
  existingMachines
}: MachineFormProps) {
  // 1. Core form state
  const [formData, setFormData] = useState<Partial<MachineMasterItem>>({
    machineName: '',
    machineCode: '',
    machineType: 'Offset',
    manufacturer: '',
    installationYear: new Date().getFullYear(),
    status: 'Active',
    numColors: 4,
    plateSizeWidth: 785,
    plateSizeHeight: 1030,
    maxSheetWidth: 720,
    maxSheetHeight: 1020,
    minSheetWidth: 340,
    minSheetHeight: 480,
    printableAreaWidth: 700,
    printableAreaHeight: 1010,
    gripperMargin: 12,
    leftMargin: 8,
    rightMargin: 8,
    tailMargin: 10,
    avgSpeed: 15000,
    registerTime: 15,
    registerWastage: 50,
    makeReadyWastage: 150,
    plateCost: 650,
    printChargePer1000: 450,
    supportedPrintingMethods: ['Sheetwise'],
    sheetMappings: []
  });

  // 2. State for the interactive mapping creator
  const [newMapping, setNewMapping] = useState({
    parentWidth: 20,
    parentHeight: 30,
    machineWidth: 15,
    machineHeight: 20,
    labelSuffix: ''
  });

  const [errors, setErrors] = useState<ValidationErrorMap>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Initialize form with machine data if we are editing
  useEffect(() => {
    if (machine) {
      setFormData({
        ...machine,
        // Fallback for older data types in storage
        supportedPrintingMethods: machine.supportedPrintingMethods || [],
        sheetMappings: machine.sheetMappings || []
      });
    }
  }, [machine]);

  // Handle standard input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;

    if (type === 'number') {
      finalValue = value === '' ? '' : parseFloat(value);
    }

    const updatedData = { ...formData, [name]: finalValue };
    setFormData(updatedData);

    if (submitAttempted) {
      const { errors: newErrors } = validateMachine(updatedData, existingMachines, machine?.id);
      setErrors(newErrors);
    }
  };

  // Handle dropdown selection changes
  const handleSelectChange = (e: SelectChangeEvent<any>) => {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);

    if (submitAttempted) {
      const { errors: newErrors } = validateMachine(updatedData, existingMachines, machine?.id);
      setErrors(newErrors);
    }
  };

  // Handle Multi-Select for Supported Printing Methods
  const handleMethodsChange = (event: SelectChangeEvent<any>) => {
    const value = event.target.value;
    const updatedMethods = typeof value === 'string' ? value.split(',') : (value as string[]);
    
    const updatedData = {
      ...formData,
      supportedPrintingMethods: updatedMethods as PrintingMethod[]
    };
    setFormData(updatedData);

    if (submitAttempted) {
      const { errors: newErrors } = validateMachine(updatedData, existingMachines, machine?.id);
      setErrors(newErrors);
    }
  };

  // Handler to add custom sheet mapping to current state
  const handleAddMapping = () => {
    const { parentWidth, parentHeight, machineWidth, machineHeight, labelSuffix } = newMapping;
    
    if (parentWidth <= 0 || parentHeight <= 0 || machineWidth <= 0 || machineHeight <= 0) {
      alert('All mapping dimensions must be positive values.');
      return;
    }

    const mappingId = `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const suffixText = labelSuffix.trim() ? ` (${labelSuffix.trim()})` : '';
    const generatedLabel = `${parentWidth}×${parentHeight} → ${machineWidth}×${machineHeight}${suffixText}`;

    const item: SheetMappingItem = {
      id: mappingId,
      parentWidth,
      parentHeight,
      machineWidth,
      machineHeight,
      label: generatedLabel
    };

    const updatedMappings = [...(formData.sheetMappings || []), item];
    setFormData({
      ...formData,
      sheetMappings: updatedMappings
    });

    // Reset fields for next entry
    setNewMapping({
      parentWidth: 20,
      parentHeight: 30,
      machineWidth: 15,
      machineHeight: 20,
      labelSuffix: ''
    });
  };

  // Handler to delete sheet mapping row
  const handleDeleteMapping = (id: string) => {
    const updatedMappings = (formData.sheetMappings || []).filter((item) => item.id !== id);
    setFormData({
      ...formData,
      sheetMappings: updatedMappings
    });
  };

  // Seed standard spec examples automatically
  const handleSeedStandardMappings = () => {
    const standardCuts = [
      { parentWidth: 20, parentHeight: 30, machineWidth: 15, machineHeight: 20, label: '20×30 → 15×20 (Half Sheet)' },
      { parentWidth: 20, parentHeight: 30, machineWidth: 10, machineHeight: 15, label: '20×30 → 10×15 (Quarter Sheet)' },
      { parentWidth: 25, parentHeight: 36, machineWidth: 18, machineHeight: 25, label: '25×36 → 18×25' },
      { parentWidth: 25, parentHeight: 38, machineWidth: 18, machineHeight: 25, label: '25×38 → 18×25' },
      { parentWidth: 25, parentHeight: 39, machineWidth: 18, machineHeight: 25, label: '25×39 → 18×25' }
    ];

    const seededItems: SheetMappingItem[] = standardCuts.map((cut, idx) => ({
      id: `sm-seed-${idx}-${Date.now()}`,
      parentWidth: cut.parentWidth,
      parentHeight: cut.parentHeight,
      machineWidth: cut.machineWidth,
      machineHeight: cut.machineHeight,
      label: cut.label
    }));

    // Merge without duplicates based on label text
    const existingLabels = new Set((formData.sheetMappings || []).map((m) => m.label));
    const uniqueSeeded = seededItems.filter((item) => !existingLabels.has(item.label));

    setFormData({
      ...formData,
      sheetMappings: [...(formData.sheetMappings || []), ...uniqueSeeded]
    });
  };

  // Handle full form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    const { isValid, errors: validationErrors } = validateMachine(formData, existingMachines, machine?.id);
    setErrors(validationErrors);

    if (isValid) {
      const finalMachine: MachineMasterItem = {
        id: machine?.id || `mm-${Date.now()}`,
        machineName: (formData.machineName || '').trim(),
        machineCode: (formData.machineCode || '').trim().toUpperCase(),
        machineType: formData.machineType || 'Offset',
        manufacturer: (formData.manufacturer || '').trim(),
        installationYear: Number(formData.installationYear ?? new Date().getFullYear()),
        numColors: Number(formData.numColors ?? 4),
        
        plateSizeWidth: Number(formData.plateSizeWidth ?? 0),
        plateSizeHeight: Number(formData.plateSizeHeight ?? 0),
        
        maxSheetWidth: Number(formData.maxSheetWidth ?? 0),
        maxSheetHeight: Number(formData.maxSheetHeight ?? 0),
        minSheetWidth: Number(formData.minSheetWidth ?? 0),
        minSheetHeight: Number(formData.minSheetHeight ?? 0),
        
        printableAreaWidth: Number(formData.printableAreaWidth ?? 0),
        printableAreaHeight: Number(formData.printableAreaHeight ?? 0),
        
        gripperMargin: Number(formData.gripperMargin ?? 0),
        leftMargin: Number(formData.leftMargin ?? 0),
        rightMargin: Number(formData.rightMargin ?? 0),
        tailMargin: Number(formData.tailMargin ?? 0),
        
        avgSpeed: Number(formData.avgSpeed ?? 0),
        registerTime: Number(formData.registerTime ?? 0),
        registerWastage: Number(formData.registerWastage ?? 0),
        makeReadyWastage: Number(formData.makeReadyWastage ?? 0),
        plateCost: Number(formData.plateCost ?? 0),
        printChargePer1000: Number(formData.printChargePer1000 ?? 0),
        
        supportedPrintingMethods: formData.supportedPrintingMethods || ['Sheetwise'],
        status: (formData.status as MachineStatus) || 'Active',
        sheetMappings: formData.sheetMappings || [],
        
        createdAt: machine?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: machine?.createdBy || 'subir.ghosal',
        updatedBy: 'subir.ghosal'
      };
      
      onSave(finalMachine);
    } else {
      // Scroll to top of the page to show errors alert
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      {submitAttempted && Object.keys(errors).length > 0 && (
        <Alert severity="error" sx={{ mb: 4, borderRadius: 2, fontWeight: 'medium' }}>
          Please correct the highlighted specification errors below before submitting the machine registry card.
        </Alert>
      )}

      {/* SECTION 1: General Business Info */}
      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 3, fontWeight: 'bold' }}>
          <BusinessIcon />
          1. Basic Machine Profile
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              required
              fullWidth
              id="machineName"
              name="machineName"
              label="Machine Model Name"
              value={formData.machineName}
              onChange={handleChange}
              error={!!errors.machineName}
              helperText={errors.machineName || 'e.g., Speedmaster CD 102'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              required
              fullWidth
              id="machineCode"
              name="machineCode"
              label="ERP Machine Code"
              value={formData.machineCode}
              onChange={handleChange}
              error={!!errors.machineCode}
              helperText={errors.machineCode || 'Uppercase alpha-numeric ID, e.g., HEI-CD-102'}
              disabled={!!machine} // Immutable once locked in
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl fullWidth error={!!errors.machineType}>
              <InputLabel id="machineType-label">Machine Type Category</InputLabel>
              <Select
                labelId="machineType-label"
                id="machineType"
                name="machineType"
                value={formData.machineType}
                label="Machine Type Category"
                onChange={handleSelectChange}
              >
                {MACHINE_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
              {errors.machineType && <FormHelperText>{errors.machineType}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              required
              fullWidth
              id="manufacturer"
              name="manufacturer"
              label="OEM Manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              error={!!errors.manufacturer}
              helperText={errors.manufacturer || 'e.g., Heidelberg, Komori, Xerox'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              required
              fullWidth
              id="installationYear"
              name="installationYear"
              label="Year of Installation"
              type="number"
              value={formData.installationYear ?? ''}
              onChange={handleChange}
              error={!!errors.installationYear}
              helperText={errors.installationYear || 'e.g., 2019'}
              slotProps={{ htmlInput: { min: 1950, max: new Date().getFullYear() + 1 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel id="status-label">Operational Status</InputLabel>
              <Select
                labelId="status-label"
                id="status"
                name="status"
                value={formData.status}
                label="Operational Status"
                onChange={handleSelectChange}
              >
                <MenuItem value="Active">Active / In Operation</MenuItem>
                <MenuItem value="Inactive">Inactive / Suspended</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* SECTION 2: Printing & Colors Configuration */}
      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 3, fontWeight: 'bold' }}>
          <SettingsIcon />
          2. Printing Unit Config
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              required
              fullWidth
              id="numColors"
              name="numColors"
              label="Number of Color Units (Printing Cast)"
              type="number"
              value={formData.numColors ?? ''}
              onChange={handleChange}
              error={!!errors.numColors}
              helperText={errors.numColors || 'Active print tower units (e.g., 4, 5, 6, 8, etc.)'}
              slotProps={{ htmlInput: { min: 1, max: 12, step: 1 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth error={!!errors.supportedPrintingMethods}>
              <InputLabel id="supported-methods-label">Supported Printing Methods</InputLabel>
              <Select
                labelId="supported-methods-label"
                id="supportedPrintingMethods"
                multiple
                value={(formData.supportedPrintingMethods || []) as any}
                onChange={handleMethodsChange}
                input={<OutlinedInput label="Supported Printing Methods" />}
                renderValue={(selected: any) => (selected as string[]).join(', ')}
              >
                {PRINTING_METHODS.map((method) => (
                  <MenuItem key={method} value={method}>
                    <Checkbox checked={(formData.supportedPrintingMethods || []).indexOf(method) > -1} />
                    <ListItemText primary={method} />
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {errors.supportedPrintingMethods || 'Select multiple techniques this machine supports.'}
              </FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* SECTION 3: Size Dimensions and Margins */}
      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 3, fontWeight: 'bold' }}>
          <SizeIcon />
          3. Sizing Information & Mechanical Margins
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            Plate Dimensions
            <Tooltip title="Leave as 0 for plate-free machinery such as digital presses.">
              <IconButton size="small"><InfoIcon fontSize="inherit" /></IconButton>
            </Tooltip>
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                required
                fullWidth
                id="plateSizeWidth"
                name="plateSizeWidth"
                label="Plate Width (mm)"
                type="number"
                value={formData.plateSizeWidth ?? ''}
                onChange={handleChange}
                error={!!errors.plateSizeWidth}
                helperText={errors.plateSizeWidth}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                required
                fullWidth
                id="plateSizeHeight"
                name="plateSizeHeight"
                label="Plate Height (mm)"
                type="number"
                value={formData.plateSizeHeight ?? ''}
                onChange={handleChange}
                error={!!errors.plateSizeHeight}
                helperText={errors.plateSizeHeight}
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1.5, color: 'text.secondary' }}>
            Sheet Sizing Bounds (mm)
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                required
                fullWidth
                id="minSheetWidth"
                name="minSheetWidth"
                label="Min Sheet Width (mm)"
                type="number"
                value={formData.minSheetWidth ?? ''}
                onChange={handleChange}
                error={!!errors.minSheetWidth}
                helperText={errors.minSheetWidth}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                required
                fullWidth
                id="minSheetHeight"
                name="minSheetHeight"
                label="Min Sheet Height (mm)"
                type="number"
                value={formData.minSheetHeight ?? ''}
                onChange={handleChange}
                error={!!errors.minSheetHeight}
                helperText={errors.minSheetHeight}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                required
                fullWidth
                id="maxSheetWidth"
                name="maxSheetWidth"
                label="Max Sheet Width (mm)"
                type="number"
                value={formData.maxSheetWidth ?? ''}
                onChange={handleChange}
                error={!!errors.maxSheetWidth}
                helperText={errors.maxSheetWidth}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                required
                fullWidth
                id="maxSheetHeight"
                name="maxSheetHeight"
                label="Max Sheet Height (mm)"
                type="number"
                value={formData.maxSheetHeight ?? ''}
                onChange={handleChange}
                error={!!errors.maxSheetHeight}
                helperText={errors.maxSheetHeight}
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            Printable Area Bounds & Margins (mm)
            <Tooltip title="Limits how close to the edges of sheets ink can be placed.">
              <IconButton size="small"><InfoIcon fontSize="inherit" /></IconButton>
            </Tooltip>
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                required
                fullWidth
                id="printableAreaWidth"
                name="printableAreaWidth"
                label="Max Printable Area Width (mm)"
                type="number"
                value={formData.printableAreaWidth ?? ''}
                onChange={handleChange}
                error={!!errors.printableAreaWidth}
                helperText={errors.printableAreaWidth}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                required
                fullWidth
                id="printableAreaHeight"
                name="printableAreaHeight"
                label="Max Printable Area Height (mm)"
                type="number"
                value={formData.printableAreaHeight ?? ''}
                onChange={handleChange}
                error={!!errors.printableAreaHeight}
                helperText={errors.printableAreaHeight}
              />
            </Grid>
            
            {/* Margins */}
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                required
                fullWidth
                id="gripperMargin"
                name="gripperMargin"
                label="Gripper Margin (mm)"
                type="number"
                value={formData.gripperMargin ?? ''}
                onChange={handleChange}
                error={!!errors.gripperMargin}
                helperText={errors.gripperMargin}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                required
                fullWidth
                id="leftMargin"
                name="leftMargin"
                label="Left Margin (mm)"
                type="number"
                value={formData.leftMargin ?? ''}
                onChange={handleChange}
                error={!!errors.leftMargin}
                helperText={errors.leftMargin}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                required
                fullWidth
                id="rightMargin"
                name="rightMargin"
                label="Right Margin (mm)"
                type="number"
                value={formData.rightMargin ?? ''}
                onChange={handleChange}
                error={!!errors.rightMargin}
                helperText={errors.rightMargin}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                required
                fullWidth
                id="tailMargin"
                name="tailMargin"
                label="Tail Margin (mm)"
                type="number"
                value={formData.tailMargin ?? ''}
                onChange={handleChange}
                error={!!errors.tailMargin}
                helperText={errors.tailMargin}
              />
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* SECTION 4: Costings & Performance Metrics */}
      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 3, fontWeight: 'bold' }}>
          <MoneyIcon />
          4. Performance Specs & Financial Coefficients
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              required
              fullWidth
              id="avgSpeed"
              name="avgSpeed"
              label="Running Speed (Sheets/Hour)"
              type="number"
              value={formData.avgSpeed ?? ''}
              onChange={handleChange}
              error={!!errors.avgSpeed}
              helperText={errors.avgSpeed}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              required
              fullWidth
              id="registerTime"
              name="registerTime"
              label="Job Register Setup Time (Mins)"
              type="number"
              value={formData.registerTime ?? ''}
              onChange={handleChange}
              error={!!errors.registerTime}
              helperText={errors.registerTime}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              required
              fullWidth
              id="registerWastage"
              name="registerWastage"
              label="Registration Wastage (Sheets)"
              type="number"
              value={formData.registerWastage ?? ''}
              onChange={handleChange}
              error={!!errors.registerWastage}
              helperText={errors.registerWastage}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              required
              fullWidth
              id="makeReadyWastage"
              name="makeReadyWastage"
              label="Makeready Run Wastage (Sheets)"
              type="number"
              value={formData.makeReadyWastage ?? ''}
              onChange={handleChange}
              error={!!errors.makeReadyWastage}
              helperText={errors.makeReadyWastage}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              required
              fullWidth
              id="plateCost"
              name="plateCost"
              label="Plate Production Cost (Rs. / Plate)"
              type="number"
              value={formData.plateCost ?? ''}
              onChange={handleChange}
              error={!!errors.plateCost}
              helperText={errors.plateCost}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              required
              fullWidth
              id="printChargePer1000"
              name="printChargePer1000"
              label="Run Charge (Rs. / 1,000 Sheets)"
              type="number"
              value={formData.printChargePer1000 ?? ''}
              onChange={handleChange}
              error={!!errors.printChargePer1000}
              helperText={errors.printChargePer1000}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* SECTION 5: Parent to Machine Sheet Mapping (Interactive Creator) */}
      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: 1.5 }}>
          <Box>
            <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1.2, fontWeight: 'bold' }}>
              <BuildIcon />
              5. Parent Sheet to Machine Sheet Mappings
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Specify which parent standard inventory sizes cut down to feed into this machinery.
            </Typography>
          </Box>
          <Button
            id="btn-seed-standard-sheets"
            size="small"
            variant="outlined"
            color="secondary"
            startIcon={<SparkIcon />}
            onClick={handleSeedStandardMappings}
            sx={{ textTransform: 'none', fontWeight: 'bold' }}
          >
            Load Standard Cuts Specs
          </Button>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card variant="outlined" sx={{ bgcolor: 'action.hover', height: '100%', borderRadius: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Create Custom Cut Specification
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Parent Width"
                      type="number"
                      value={newMapping.parentWidth}
                      onChange={(e) => setNewMapping({ ...newMapping, parentWidth: Number(e.target.value) })}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Parent Height"
                      type="number"
                      value={newMapping.parentHeight}
                      onChange={(e) => setNewMapping({ ...newMapping, parentHeight: Number(e.target.value) })}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Machine Cut Width"
                      type="number"
                      value={newMapping.machineWidth}
                      onChange={(e) => setNewMapping({ ...newMapping, machineWidth: Number(e.target.value) })}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Machine Cut Height"
                      type="number"
                      value={newMapping.machineHeight}
                      onChange={(e) => setNewMapping({ ...newMapping, machineHeight: Number(e.target.value) })}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Optional Note (e.g. 4-up, Half Cut)"
                      value={newMapping.labelSuffix}
                      placeholder="e.g. Half sheet cut, 4-up"
                      onChange={(e) => setNewMapping({ ...newMapping, labelSuffix: e.target.value })}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button
                      id="btn-add-sheet-mapping"
                      fullWidth
                      size="medium"
                      variant="contained"
                      color="secondary"
                      startIcon={<AddIcon />}
                      onClick={handleAddMapping}
                      sx={{ textTransform: 'none', fontWeight: 'bold' }}
                    >
                      Map Sizing Cuts Row
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, height: '100%', maxHeight: 290, overflowY: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Parent Size</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Machine Size</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Formed Cut Title</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(!formData.sheetMappings || formData.sheetMappings.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No physical sheet mappings declared for this press. Load defaults above or declare custom cuts.
                      </TableCell>
                    </TableRow>
                  ) : (
                    formData.sheetMappings.map((map) => (
                      <TableRow hover key={map.id}>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{map.parentWidth} × {map.parentHeight}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{map.machineWidth} × {map.machineHeight}</TableCell>
                        <TableCell sx={{ fontWeight: 'medium', fontSize: '0.8rem' }}>{map.label}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Delete Sizing Cut">
                            <IconButton
                              id={`btn-delete-mapping-${map.id}`}
                              size="small"
                              color="error"
                              onClick={() => handleDeleteMapping(map.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </Paper>

      {/* Save / Cancel controls footer */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 6 }}>
        <Button
          id="btn-form-cancel"
          variant="outlined"
          color="inherit"
          startIcon={<CancelIcon />}
          onClick={onCancel}
          sx={{ px: 4, py: 1.2, textTransform: 'none', fontWeight: 'bold' }}
        >
          Cancel
        </Button>
        <Button
          id="btn-form-save"
          type="submit"
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          sx={{ px: 4, py: 1.2, textTransform: 'none', fontWeight: 'bold' }}
        >
          {machine ? 'Save Sizing Specifications' : 'Register New Enterprise Machine'}
        </Button>
      </Box>
    </Box>
  );
}
