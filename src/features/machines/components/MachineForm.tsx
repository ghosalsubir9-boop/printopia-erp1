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
  SelectChangeEvent
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Settings as SettingsIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as SpeedIcon,
  SquareFoot as SizeIcon
} from '@mui/icons-material';
import { MachineMasterItem, PrintingMethod, MachineStatus } from '../types';

interface MachineFormProps {
  machine: MachineMasterItem | null;
  onSave: (machine: MachineMasterItem) => void;
  onCancel: () => void;
  existingMachines: MachineMasterItem[];
}

interface FormErrors {
  machineName?: string;
  machineCode?: string;
  machineType?: string;
  numColors?: string;
  plateSizeWidth?: string;
  plateSizeHeight?: string;
  maxSheetWidth?: string;
  maxSheetHeight?: string;
  supportedSheetSizes?: string;
  avgSpeed?: string;
  plateCost?: string;
  printChargePer1000?: string;
  registerTime?: string;
  registerWastage?: string;
  makeReadyWastage?: string;
  gripperMargin?: string;
  leftMargin?: string;
  rightMargin?: string;
  tailMargin?: string;
}

const MACHINE_TYPES = ['Offset', 'Digital', 'Flexo', 'Screen', 'Gravure', 'Letterpress', 'Finishing / Bindery'];
const PRINTING_METHODS: PrintingMethod[] = ['Sheetwise', 'Work & Turn', 'Work & Tumble'];

export default function MachineForm({
  machine,
  onSave,
  onCancel,
  existingMachines
}: MachineFormProps) {
  const [formData, setFormData] = useState<Partial<MachineMasterItem>>({
    machineName: '',
    machineCode: '',
    machineType: 'Offset',
    numColors: 4,
    plateSizeWidth: 785,
    plateSizeHeight: 1030,
    maxSheetWidth: 720,
    maxSheetHeight: 1020,
    supportedSheetSizes: '28x40, 23x36, 18x23',
    avgSpeed: 15000,
    plateCost: 650,
    printChargePer1000: 450,
    registerTime: 15,
    registerWastage: 50,
    makeReadyWastage: 150,
    gripperMargin: 12,
    leftMargin: 8,
    rightMargin: 8,
    tailMargin: 10,
    printingMethod: 'Sheetwise',
    status: 'Active'
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (machine) {
      setFormData(machine);
    }
  }, [machine]);

  const validate = (data: Partial<MachineMasterItem>): boolean => {
    const tempErrors: FormErrors = {};

    // 1. Machine Name
    if (!data.machineName || data.machineName.trim() === '') {
      tempErrors.machineName = 'Machine Name is required';
    } else if (data.machineName.length < 3) {
      tempErrors.machineName = 'Name must be at least 3 characters long';
    }

    // 2. Machine Code
    if (!data.machineCode || data.machineCode.trim() === '') {
      tempErrors.machineCode = 'Machine Code is required';
    } else {
      const codeRegex = /^[A-Z0-9_\-]+$/i;
      if (!codeRegex.test(data.machineCode)) {
        tempErrors.machineCode = 'Code can only contain letters, numbers, hyphens, and underscores';
      } else {
        // Unique check
        const isDuplicate = existingMachines.some(
          (m) => m.machineCode.toLowerCase() === data.machineCode?.toLowerCase() && m.id !== machine?.id
        );
        if (isDuplicate) {
          tempErrors.machineCode = 'This Machine Code is already in use';
        }
      }
    }

    // 3. Machine Type
    if (!data.machineType) {
      tempErrors.machineType = 'Machine Type is required';
    }

    // 4. Colors
    if (data.numColors === undefined || data.numColors < 1 || data.numColors > 12) {
      tempErrors.numColors = 'Colors must be between 1 and 12';
    }

    // 5. Plate dimensions
    if (data.plateSizeWidth === undefined || data.plateSizeWidth < 0) {
      tempErrors.plateSizeWidth = 'Width must be a non-negative number';
    }
    if (data.plateSizeHeight === undefined || data.plateSizeHeight < 0) {
      tempErrors.plateSizeHeight = 'Height must be a non-negative number';
    }

    // 6. Max sheet dimensions
    if (data.maxSheetWidth === undefined || data.maxSheetWidth <= 0) {
      tempErrors.maxSheetWidth = 'Max sheet width must be greater than 0';
    }
    if (data.maxSheetHeight === undefined || data.maxSheetHeight <= 0) {
      tempErrors.maxSheetHeight = 'Max sheet height must be greater than 0';
    }

    // 7. Supported sheet sizes
    if (!data.supportedSheetSizes || data.supportedSheetSizes.trim() === '') {
      tempErrors.supportedSheetSizes = 'Please supply at least one sheet size';
    }

    // 8. Speeds & Costing
    if (data.avgSpeed === undefined || data.avgSpeed <= 0) {
      tempErrors.avgSpeed = 'Average Speed must be greater than 0';
    }
    if (data.plateCost === undefined || data.plateCost < 0) {
      tempErrors.plateCost = 'Plate Cost cannot be negative';
    }
    if (data.printChargePer1000 === undefined || data.printChargePer1000 < 0) {
      tempErrors.printChargePer1000 = 'Printing charge cannot be negative';
    }
    if (data.registerTime === undefined || data.registerTime < 0) {
      tempErrors.registerTime = 'Register time cannot be negative';
    }

    // 9. Wastage & Margins
    if (data.registerWastage === undefined || data.registerWastage < 0) {
      tempErrors.registerWastage = 'Register wastage cannot be negative';
    }
    if (data.makeReadyWastage === undefined || data.makeReadyWastage < 0) {
      tempErrors.makeReadyWastage = 'Make ready wastage cannot be negative';
    }
    if (data.gripperMargin === undefined || data.gripperMargin < 0) {
      tempErrors.gripperMargin = 'Gripper margin cannot be negative';
    }
    if (data.leftMargin === undefined || data.leftMargin < 0) {
      tempErrors.leftMargin = 'Left margin cannot be negative';
    }
    if (data.rightMargin === undefined || data.rightMargin < 0) {
      tempErrors.rightMargin = 'Right margin cannot be negative';
    }
    if (data.tailMargin === undefined || data.tailMargin < 0) {
      tempErrors.tailMargin = 'Tail margin cannot be negative';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;

    if (type === 'number') {
      finalValue = value === '' ? '' : parseFloat(value);
    }

    const updatedData = { ...formData, [name]: finalValue };
    setFormData(updatedData);

    if (submitAttempted) {
      validate(updatedData);
    }
  };

  const handleSelectChange = (e: SelectChangeEvent<any>) => {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);

    if (submitAttempted) {
      validate(updatedData);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (validate(formData)) {
      const finalMachine: MachineMasterItem = {
        id: machine?.id || `mm-${Date.now()}`,
        machineName: formData.machineName || '',
        machineCode: formData.machineCode || '',
        machineType: formData.machineType || 'Offset',
        numColors: Number(formData.numColors ?? 1),
        plateSizeWidth: Number(formData.plateSizeWidth ?? 0),
        plateSizeHeight: Number(formData.plateSizeHeight ?? 0),
        maxSheetWidth: Number(formData.maxSheetWidth ?? 0),
        maxSheetHeight: Number(formData.maxSheetHeight ?? 0),
        supportedSheetSizes: formData.supportedSheetSizes || '',
        avgSpeed: Number(formData.avgSpeed ?? 0),
        plateCost: Number(formData.plateCost ?? 0),
        printChargePer1000: Number(formData.printChargePer1000 ?? 0),
        registerTime: Number(formData.registerTime ?? 0),
        registerWastage: Number(formData.registerWastage ?? 0),
        makeReadyWastage: Number(formData.makeReadyWastage ?? 0),
        gripperMargin: Number(formData.gripperMargin ?? 0),
        leftMargin: Number(formData.leftMargin ?? 0),
        rightMargin: Number(formData.rightMargin ?? 0),
        tailMargin: Number(formData.tailMargin ?? 0),
        printingMethod: (formData.printingMethod as PrintingMethod) || 'Sheetwise',
        status: (formData.status as MachineStatus) || 'Active',
        createdAt: machine?.createdAt || new Date().toISOString()
      };
      onSave(finalMachine);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, fontWeight: 'bold' }}>
          <SettingsIcon />
          General Information
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              required
              fullWidth
              id="machineName"
              name="machineName"
              label="Machine Name"
              value={formData.machineName}
              onChange={handleChange}
              error={!!errors.machineName}
              helperText={errors.machineName || 'e.g. Heidelberg Speedmaster CD 102'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              required
              fullWidth
              id="machineCode"
              name="machineCode"
              label="Machine Code"
              value={formData.machineCode}
              onChange={handleChange}
              error={!!errors.machineCode}
              helperText={errors.machineCode || 'Unique machine tag, e.g. HEI-CD-102'}
              disabled={!!machine} // Machine Code is immutable once registered
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl fullWidth error={!!errors.machineType}>
              <InputLabel id="machineType-label">Machine Type</InputLabel>
              <Select
                labelId="machineType-label"
                id="machineType"
                name="machineType"
                value={formData.machineType}
                label="Machine Type"
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
            <FormControl fullWidth>
              <InputLabel id="printingMethod-label">Printing Method</InputLabel>
              <Select
                labelId="printingMethod-label"
                id="printingMethod"
                name="printingMethod"
                value={formData.printingMethod}
                label="Printing Method"
                onChange={handleSelectChange}
              >
                {PRINTING_METHODS.map((method) => (
                  <MenuItem key={method} value={method}>
                    {method}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, fontWeight: 'bold' }}>
          <SizeIcon />
          Physical & Technical Specs
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              required
              fullWidth
              id="numColors"
              name="numColors"
              label="Number of Colors"
              type="number"
              value={formData.numColors ?? ''}
              onChange={handleChange}
              error={!!errors.numColors}
              helperText={errors.numColors || 'Range: 1 - 12'}
              slotProps={{ htmlInput: { min: 1, max: 12, step: 1 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              required
              fullWidth
              id="plateSizeWidth"
              name="plateSizeWidth"
              label="Plate Size Width (mm)"
              type="number"
              value={formData.plateSizeWidth ?? ''}
              onChange={handleChange}
              error={!!errors.plateSizeWidth}
              helperText={errors.plateSizeWidth || 'Use 0 if not applicable (e.g. digital)'}
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              required
              fullWidth
              id="plateSizeHeight"
              name="plateSizeHeight"
              label="Plate Size Height (mm)"
              type="number"
              value={formData.plateSizeHeight ?? ''}
              onChange={handleChange}
              error={!!errors.plateSizeHeight}
              helperText={errors.plateSizeHeight || 'Use 0 if not applicable (e.g. digital)'}
              slotProps={{ htmlInput: { min: 0 } }}
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
              slotProps={{ htmlInput: { min: 1 } }}
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
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 9, md: 9 }}>
            <TextField
              required
              fullWidth
              id="supportedSheetSizes"
              name="supportedSheetSizes"
              label="Supported Machine Sheet Sizes"
              placeholder="e.g. 28x40, 25x38, 23x36, A3, 13x19"
              value={formData.supportedSheetSizes}
              onChange={handleChange}
              error={!!errors.supportedSheetSizes}
              helperText={errors.supportedSheetSizes || 'Provide standard sheet sizes supported, comma separated'}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, fontWeight: 'bold' }}>
          <MoneyIcon />
          Costing & Speeds
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              required
              fullWidth
              id="avgSpeed"
              name="avgSpeed"
              label="Average Speed (Sheets/Hour)"
              type="number"
              value={formData.avgSpeed ?? ''}
              onChange={handleChange}
              error={!!errors.avgSpeed}
              helperText={errors.avgSpeed}
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              required
              fullWidth
              id="plateCost"
              name="plateCost"
              label="Plate Cost (Rs. per Plate)"
              type="number"
              value={formData.plateCost ?? ''}
              onChange={handleChange}
              error={!!errors.plateCost}
              helperText={errors.plateCost}
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              required
              fullWidth
              id="printChargePer1000"
              name="printChargePer1000"
              label="Printing Charge (per 1000 Impressions)"
              type="number"
              value={formData.printChargePer1000 ?? ''}
              onChange={handleChange}
              error={!!errors.printChargePer1000}
              helperText={errors.printChargePer1000}
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              required
              fullWidth
              id="registerTime"
              name="registerTime"
              label="Register Time (Minutes)"
              type="number"
              value={formData.registerTime ?? ''}
              onChange={handleChange}
              error={!!errors.registerTime}
              helperText={errors.registerTime}
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, fontWeight: 'bold' }}>
          <SpeedIcon />
          Wastages & Margin Controls
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              required
              fullWidth
              id="registerWastage"
              name="registerWastage"
              label="Register Wastage (Sheets)"
              type="number"
              value={formData.registerWastage ?? ''}
              onChange={handleChange}
              error={!!errors.registerWastage}
              helperText={errors.registerWastage}
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              required
              fullWidth
              id="makeReadyWastage"
              name="makeReadyWastage"
              label="Make Ready Wastage (Sheets)"
              type="number"
              value={formData.makeReadyWastage ?? ''}
              onChange={handleChange}
              error={!!errors.makeReadyWastage}
              helperText={errors.makeReadyWastage}
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Grid>
        </Grid>
      </Paper>

      {submitAttempted && Object.keys(errors).length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Please correct the highlighted errors in the form before committing.
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 5 }}>
        <Button
          id="btn-form-cancel"
          variant="outlined"
          color="inherit"
          startIcon={<CancelIcon />}
          onClick={onCancel}
          sx={{ px: 3, py: 1 }}
        >
          Cancel
        </Button>
        <Button
          id="btn-form-save"
          type="submit"
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          sx={{ px: 3, py: 1, fontWeight: 'bold' }}
        >
          {machine ? 'Update Machine' : 'Register Machine'}
        </Button>
      </Box>
    </Box>
  );
}
