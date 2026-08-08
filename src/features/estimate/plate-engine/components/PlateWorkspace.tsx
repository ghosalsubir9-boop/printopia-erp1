/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Button,
  Chip,
  Tooltip,
  Alert,
  Stack,
  Divider,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Layers as PlatesIcon,
  AutoAwesome as SparklesIcon,
  Tune as SettingsIcon,
  Save as SaveIcon,
  ImportContacts as ImportIcon,
  DeleteOutlined as DeleteIcon,
  CheckCircle as SuccessIcon,
  HelpOutlineOutlined as HelpIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';

import { PlateIntelligenceService } from '../services/api';
import { PlateEngineValidator, PlateValidationError } from '../validation';
import { PlateCalculationInput, EstimatePlateRecord, PlateMethodResult } from '../types';

import { MachineApiService } from '../../../machines/services/api';
import { EstimateApiService } from '../../job-entry/services/api';
import { MachineMasterItem, PrintingMethod } from '../../../machines/types';
import { EstimateJob } from '../../job-entry/types';

import PlateSummaryCard from './PlateSummaryCard';
import PlateComparisonTable from './PlateComparisonTable';
import PlateRecommendationCard from './PlateRecommendationCard';

export default function PlateWorkspace() {
  // --- MASTER DATA STATES ---
  const [estimateJobs, setEstimateJobs] = useState<EstimateJob[]>([]);
  const [machines, setMachines] = useState<MachineMasterItem[]>([]);
  const [savedLayouts, setSavedLayouts] = useState<any[]>([]);
  
  // --- INPUT STATES ---
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
  const [machineId, setMachineId] = useState<string>('');
  const [frontColors, setFrontColors] = useState<number>(4);
  const [backColors, setBackColors] = useState<number>(0);
  const [printingSide, setPrintingSide] = useState<'Single Side' | 'Both Side'>('Single Side');
  const [quantity, setQuantity] = useState<number>(5000);
  const [customPlateCost, setCustomPlateCost] = useState<string>(''); // string to allow clean editing
  const [samePlateForFrontAndBack, setSamePlateForFrontAndBack] = useState<boolean>(false);
  const [manualPlateQty, setManualPlateQty] = useState<string>(''); // string to support empty/clear state

  // --- UI STATES ---
  const [activeRecord, setActiveRecord] = useState<EstimatePlateRecord | null>(null);
  const [savedRecords, setSavedRecords] = useState<EstimatePlateRecord[]>([]);
  
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<PlateValidationError>({});
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // --- INITIAL DATA LOAD ---
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const jobsList = await EstimateApiService.getEstimates();
        setEstimateJobs(jobsList);

        const machinesList = await MachineApiService.getMachines({ status: 'Active' });
        setMachines(machinesList);
        if (machinesList.length > 0) {
          setMachineId(machinesList[0].id);
          setCustomPlateCost(String(machinesList[0].plateCost || 300));
        }

        // Load layouts calculated in paper engine
        const layoutsStr = localStorage.getItem('printopia_estimate_layouts') || '[]';
        try {
          const layouts = JSON.parse(layoutsStr);
          setSavedLayouts(layouts);
          if (layouts.length > 0) {
            setSelectedLayoutId(layouts[0].id);
          }
        } catch (e) {
          console.error(e);
        }

        // Load saved plate calculations (GET /estimate/plate)
        const savedPlates = await PlateIntelligenceService.getPlateRecords();
        setSavedRecords(savedPlates);
      } catch (err) {
        console.error('Error loading data in Plate Intelligence Workspace:', err);
        setErrorMessage('Failed to load Master databases. Please ensure machine and estimates registries are active.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // --- SYNCHRONIZE DEFAULTS WHEN SELECTED MACHINE CHANGES ---
  const handleMachineChange = async (mId: string) => {
    setMachineId(mId);
    const mMatch = machines.find((m) => m.id === mId);
    if (mMatch) {
      setCustomPlateCost(String(mMatch.plateCost || 300));
    }
  };

  // --- RE-CALCULATE DYNAMICALLY ---
  const runPlateEngine = () => {
    setErrorMessage('');
    setValidationErrors({});

    const input: PlateCalculationInput = {
      machineId,
      layoutId: selectedLayoutId || undefined,
      frontColors,
      backColors: printingSide === 'Single Side' ? 0 : backColors,
      printingSide,
      quantity,
      customPlateCost: customPlateCost !== '' ? Number(customPlateCost) : undefined,
      samePlateForFrontAndBack
    };

    // Validate inputs
    const validation = PlateEngineValidator.validate(input);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setActiveRecord(null);
      return;
    }

    try {
      // Resolve Machine details
      const machine = machines.find((m) => m.id === machineId);
      if (!machine) return;

      let ups = 1;
      let machineSheetsPerParent = 1;
      let parentSheetName = 'Auto Sheet';
      let machineSheetSize = 'Standard';

      if (selectedLayoutId) {
        const layoutMatch = savedLayouts.find((l) => l.id === selectedLayoutId);
        if (layoutMatch) {
          ups = layoutMatch.ups || 1;
          machineSheetsPerParent = layoutMatch.machineSheetsPerParent || 1;
          parentSheetName = layoutMatch.parentSheetName || 'Auto Sheet';
          machineSheetSize = `${layoutMatch.machineSheetWidth}″ × ${layoutMatch.machineSheetHeight}″`;
        }
      }

      // Compute Candidates using calculation engine
      const plateCostVal = customPlateCost !== '' ? Number(customPlateCost) : (machine.plateCost || 300);
      const candidates = PlateIntelligenceService.calculateMethods(
        input,
        machine.machineName,
        machine.machineCode,
        plateCostVal,
        machine.supportedPrintingMethods,
        ups,
        machineSheetsPerParent
      );

      // Find best default feasible method
      let defaultMethod: PrintingMethod = 'Sheetwise';
      const wtMatch = candidates.find((c) => c.method === 'Work & Turn' && c.isFeasible);
      const wtumbleMatch = candidates.find((c) => c.method === 'Work & Tumble' && c.isFeasible);
      const perfMatch = candidates.find((c) => c.method === 'Perfecting' && c.isFeasible);

      if (wtMatch) defaultMethod = 'Work & Turn';
      else if (wtumbleMatch) defaultMethod = 'Work & Tumble';
      else if (perfMatch) defaultMethod = 'Perfecting';

      const matchResult = candidates.find((c) => c.method === defaultMethod);

      if (matchResult) {
        const finalQty = manualPlateQty !== '' ? Number(manualPlateQty) : matchResult.systemPlates;
        setActiveRecord({
          id: 'temp-plate-record',
          machineId,
          machineName: machine.machineName,
          machineCode: machine.machineCode,
          plateCostPerPlate: plateCostVal,
          frontColors,
          backColors: printingSide === 'Single Side' ? 0 : backColors,
          printingSide,
          quantity,
          selectedLayoutId: selectedLayoutId || undefined,
          parentSheetName,
          machineSheetSize,
          ups,
          selectedMethod: defaultMethod,
          frontPlateCount: matchResult.frontPlates,
          backPlateCount: matchResult.backPlates,
          systemPlateCount: matchResult.systemPlates,
          totalPlateCount: finalQty,
          totalPlateCost: finalQty * plateCostVal,
          plateSavingCount: matchResult.plateSavingCount,
          plateSavingCost: matchResult.plateSavingCost,
          impressionMultiplier: matchResult.impressionMultiplier,
          netMachineSheets: matchResult.netMachineSheets,
          totalImpressions: matchResult.totalImpressions,
          isWorkAndTurnPossible: candidates.some((c) => c.method === 'Work & Turn' && c.isFeasible),
          isWorkAndTumblePossible: candidates.some((c) => c.method === 'Work & Tumble' && c.isFeasible),
          isPerfectingPossible: candidates.some((c) => c.method === 'Perfecting' && c.isFeasible),
          samePlateForFrontAndBack,
          manualPlateQty: manualPlateQty !== '' ? Number(manualPlateQty) : undefined,
          candidateMethods: candidates,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred during calculation.');
    }
  };

  // Run calculation dynamically whenever inputs change
  useEffect(() => {
    if (machineId && quantity > 0) {
      runPlateEngine();
    }
  }, [machineId, selectedLayoutId, frontColors, backColors, printingSide, quantity, customPlateCost, savedLayouts, samePlateForFrontAndBack]);

  // --- HANDLE MANUAL PLATE QUANTITY OVERRIDE ---
  const handleManualPlateQtyChange = (val: string) => {
    setManualPlateQty(val);
    if (!activeRecord) return;

    // Find candidate method to get system default plates
    const match = activeRecord.candidateMethods.find((c) => c.method === activeRecord.selectedMethod);
    const systemPlatesVal = match ? match.systemPlates : activeRecord.systemPlateCount;
    const finalQty = val !== '' ? Number(val) : systemPlatesVal;

    setActiveRecord({
      ...activeRecord,
      manualPlateQty: val !== '' ? Number(val) : undefined,
      totalPlateCount: finalQty,
      totalPlateCost: finalQty * activeRecord.plateCostPerPlate
    });
  };

  // --- CHOOSE CANDIDATE METHOD MANUALLY ---
  const handleSelectMethod = (method: PrintingMethod) => {
    if (!activeRecord) return;
    
    const match = activeRecord.candidateMethods.find((c) => c.method === method);
    if (match && match.isFeasible) {
      const finalQty = manualPlateQty !== '' ? Number(manualPlateQty) : match.systemPlates;
      setActiveRecord({
        ...activeRecord,
        selectedMethod: method,
        frontPlateCount: match.frontPlates,
        backPlateCount: match.backPlates,
        systemPlateCount: match.systemPlates,
        totalPlateCount: finalQty,
        totalPlateCost: finalQty * activeRecord.plateCostPerPlate,
        plateSavingCount: match.plateSavingCount,
        plateSavingCost: match.plateSavingCost,
        impressionMultiplier: match.impressionMultiplier,
        netMachineSheets: match.netMachineSheets,
        totalImpressions: match.totalImpressions
      });
    }
  };

  // --- SAVE ACTIVE RECORD TO LOCALSTORAGE ---
  const handleSaveRecord = async () => {
    if (!activeRecord) return;
    try {
      const input: PlateCalculationInput = {
        estimateId: selectedJobId || undefined,
        machineId: activeRecord.machineId,
        layoutId: activeRecord.selectedLayoutId,
        frontColors: activeRecord.frontColors,
        backColors: activeRecord.backColors,
        printingSide: activeRecord.printingSide,
        quantity: activeRecord.quantity,
        customPlateCost: activeRecord.plateCostPerPlate,
        samePlateForFrontAndBack,
        manualPlateQty: manualPlateQty !== '' ? Number(manualPlateQty) : undefined
      };

      // Call POST /estimate/plate
      const saved = await PlateIntelligenceService.calculateAndSave(input);
      
      // Override with manually selected printing method if user toggled it
      const stored = await PlateIntelligenceService.getPlateRecords();
      const match = stored.find((r) => r.id === saved.id);
      if (match) {
        match.selectedMethod = activeRecord.selectedMethod;
        const matchMethodResult = activeRecord.candidateMethods.find((c) => c.method === activeRecord.selectedMethod);
        if (matchMethodResult) {
          match.frontPlateCount = matchMethodResult.frontPlates;
          match.backPlateCount = matchMethodResult.backPlates;
          match.systemPlateCount = matchMethodResult.systemPlates;
          match.totalPlateCount = manualPlateQty !== '' ? Number(manualPlateQty) : matchMethodResult.systemPlates;
          match.totalPlateCost = match.totalPlateCount * match.plateCostPerPlate;
          match.plateSavingCount = matchMethodResult.plateSavingCount;
          match.plateSavingCost = matchMethodResult.plateSavingCost;
          match.impressionMultiplier = matchMethodResult.impressionMultiplier;
          match.netMachineSheets = matchMethodResult.netMachineSheets;
          match.totalImpressions = matchMethodResult.totalImpressions;
        }
        match.samePlateForFrontAndBack = samePlateForFrontAndBack;
        match.manualPlateQty = manualPlateQty !== '' ? Number(manualPlateQty) : undefined;
        localStorage.setItem('printopia_estimate_plates', JSON.stringify(stored));
      }

      setSaveSuccess(true);
      // Reload lists
      const updatedList = await PlateIntelligenceService.getPlateRecords();
      setSavedRecords(updatedList);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to persist plate calculation record.');
    }
  };

  // --- DELETE LOG RECORD ---
  const handleDeleteRecord = async (id: string) => {
    try {
      await PlateIntelligenceService.deletePlateRecord(id);
      const updatedList = await PlateIntelligenceService.getPlateRecords();
      setSavedRecords(updatedList);
      setInfoMessage('Plate calculation record removed.');
      setTimeout(() => setInfoMessage(''), 3000);
    } catch (err) {
      setErrorMessage('Failed to delete calculation entry.');
    }
  };

  // --- IMPORT SPECS FROM REGISTRY ---
  const handleImportJob = (jobId: string) => {
    setSelectedJobId(jobId);
    if (!jobId) return;

    const job = estimateJobs.find((j) => j.id === jobId);
    if (!job) return;

    setQuantity(job.finalQuantity || job.orderQuantity);
    setPrintingSide(job.printingType === 'Both Side' ? 'Both Side' : 'Single Side');
    setFrontColors(job.frontColor || 4);
    setBackColors(job.backColor || 0);

    if (job.machineId) {
      setMachineId(job.machineId);
      const mMatch = machines.find((m) => m.id === job.machineId);
      if (mMatch) {
        setCustomPlateCost(String(mMatch.plateCost || 300));
      }
    }

    // Try to auto-match a saved layout from this machine
    const relatedLayout = savedLayouts.find((l) => l.machineId === job.machineId);
    if (relatedLayout) {
      setSelectedLayoutId(relatedLayout.id);
    }

    setInfoMessage(`Imported specs from Job Card ${job.estimateNumber}`);
    setTimeout(() => setInfoMessage(''), 3500);
  };

  return (
    <Box sx={{ p: 0 }}>
      {/* Alert Notifications */}
      {infoMessage && <Alert severity="info" sx={{ mb: 2, borderRadius: 2, fontWeight: 'bold' }}>{infoMessage}</Alert>}
      {errorMessage && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontWeight: 'bold' }}>{errorMessage}</Alert>}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          Plate calculation record successfully written to estimate_plate database log!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Side: Setup parameters */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={3}>
            {/* Import card */}
            <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'primary.light', bgcolor: 'primary.lighter' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" color="primary.dark" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ImportIcon /> Step 1: Bind Estimate Specs
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Import from Estimate Job Registry"
                  value={selectedJobId}
                  onChange={(e) => handleImportJob(e.target.value)}
                  sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
                >
                  <MenuItem value="">-- Select active estimate job card --</MenuItem>
                  {estimateJobs.map((j) => (
                    <MenuItem key={j.id} value={j.id}>
                      {j.estimateNumber} - {j.customerName} ({j.productName})
                    </MenuItem>
                  ))}
                </TextField>
              </CardContent>
            </Card>

            {/* Calculations Input Panel */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsIcon color="primary" /> Setup Plate Parameters
                </Typography>
                <Chip label="Master Linked" color="primary" size="small" sx={{ fontWeight: 'bold', height: 18, fontSize: '0.62rem' }} />
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                  {/* Selected Layout Linkage */}
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Select Paper Intelligence Layout"
                    value={selectedLayoutId}
                    onChange={(e) => setSelectedLayoutId(e.target.value)}
                    helperText="Loads sheet dimensions, ups and cutting configurations"
                  >
                    <MenuItem value="">-- Run with default 1-Up sheet bounds --</MenuItem>
                    {savedLayouts.map((l: any) => (
                      <MenuItem key={l.id} value={l.id}>
                        {l.machineCode} • {l.parentSheetName} ({l.ups} Ups, {l.totalWastePercent}% waste)
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Printing Press selection */}
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Select Printing Press (Machine Required)*"
                    value={machineId}
                    onChange={(e) => handleMachineChange(e.target.value)}
                    error={!!validationErrors.machineId}
                    helperText={validationErrors.machineId}
                    required
                  >
                    {machines.map((m) => (
                      <MenuItem key={m.id} value={m.id}>
                        {m.machineName} ({m.machineCode})
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Printing Side Toggle */}
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Printing Side Configuration*"
                    value={printingSide}
                    onChange={(e) => setPrintingSide(e.target.value as 'Single Side' | 'Both Side')}
                    error={!!validationErrors.printingSide}
                    helperText={validationErrors.printingSide}
                  >
                    <MenuItem value="Single Side">Single Side Printing</MenuItem>
                    <MenuItem value="Both Side">Both Side (Duplex) Printing</MenuItem>
                  </TextField>

                  {/* Colors Setup */}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Front Side Colors*"
                        value={frontColors}
                        onChange={(e) => setFrontColors(Math.max(0, Number(e.target.value)))}
                        error={!!validationErrors.frontColors}
                        helperText={validationErrors.frontColors}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Back Side Colors"
                        value={printingSide === 'Single Side' ? 0 : backColors}
                        disabled={printingSide === 'Single Side'}
                        onChange={(e) => setBackColors(Math.max(0, Number(e.target.value)))}
                        error={!!validationErrors.backColors}
                        helperText={validationErrors.backColors}
                      />
                    </Grid>
                  </Grid>

                  {/* Same Plate Used Checkbox */}
                  {printingSide === 'Both Side' && (
                    <Box id="form-field-samePlateForFrontAndBack" sx={{ px: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={samePlateForFrontAndBack}
                            onChange={(e) => setSamePlateForFrontAndBack(e.target.checked)}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              Same Plate Used for Front & Back
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              If checked, the same plate set will be reused, preventing duplicate plate count.
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                  )}

                  {/* Run quantity */}
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Run Print Copies (Quantity)*"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    error={!!validationErrors.quantity}
                    helperText={validationErrors.quantity}
                  />

                  {/* Unit Plate Cost (Editable!) */}
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Unit Plate Cost (₹) - Editable*"
                    value={customPlateCost}
                    onChange={(e) => setCustomPlateCost(e.target.value)}
                    helperText="Loaded dynamically from Machine Master. Modify to override."
                  />
                </Stack>
              </CardContent>
            </Card>

            {/* Quick Education Callout */}
            <Box sx={{ p: 2, bgcolor: 'action.disabledBackground', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <HelpIcon color="primary" sx={{ fontSize: '1.1rem' }} /> Plate Savings Guide
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                - <strong>Sheetwise</strong> uses separate sets of plates for front & back, which can double your plate preparation overhead.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                - <strong>Work & Turn / Work & Tumble</strong> places front & back side-by-side or top-to-bottom on the plate. That means a single set of plates prints both sides, immediately dropping your plate count & costs by 50%!
              </Typography>
            </Box>
          </Stack>
        </Grid>

        {/* Right Side: Active calculations, Recommendations & Saved database logs */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={3}>
            {activeRecord ? (
              <>
                {/* Plate Summary Card */}
                <PlateSummaryCard
                  record={activeRecord}
                  manualPlateQty={manualPlateQty}
                  onManualPlateQtyChange={handleManualPlateQtyChange}
                />

                {/* AI Recommendation Panel */}
                <PlateRecommendationCard record={activeRecord} />

                {/* Candidate Methods Comparison Table */}
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                  <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                      Printing Methods Plate Comparison
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveRecord}
                      sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 'bold' }}
                    >
                      Commit Plate Specs
                    </Button>
                  </Box>
                  <CardContent sx={{ p: 0 }}>
                    <PlateComparisonTable
                      candidates={activeRecord.candidateMethods}
                      selectedMethod={activeRecord.selectedMethod}
                      onSelectMethod={handleSelectMethod}
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justify: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 3, height: '100%', minHeight: 300 }}>
                <PlatesIcon sx={{ fontSize: '4rem', color: 'text.secondary', mb: 1.5 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  Calculation Queue Suspended
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 360, mb: 2 }}>
                  Adjust front colors, printing side, or choose a press on the left panel to fire the Plate Intelligence Engine calculations.
                </Typography>
              </Box>
            )}

            {/* Saved database records (GET /estimate/plate logs) */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                  Database Records: estimate_plate
                </Typography>
              </Box>
              <TableContainer sx={{ maxHeight: 280 }}>
                <Table stickyHeader size="small" aria-label="saved plate calculation logs">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Job Card</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Selected Press</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Method</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Plates</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Plate Cost</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Savings</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {savedRecords.length > 0 ? (
                      savedRecords.map((rec) => (
                        <TableRow key={rec.id} hover>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            {rec.estimateNumber || 'Manual entry'}
                          </TableCell>
                          <TableCell>{rec.machineCode}</TableCell>
                          <TableCell>
                            <Chip label={rec.selectedMethod} size="small" color="primary" variant="outlined" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 'bold' }} />
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>{rec.totalPlateCount}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>₹{rec.totalPlateCost.toLocaleString()}</TableCell>
                          <TableCell align="center">
                            {rec.plateSavingCount > 0 ? (
                              <Typography variant="caption" sx={{ color: 'success.dark', fontWeight: 'bold' }}>
                                -₹{rec.plateSavingCost.toLocaleString()}
                              </Typography>
                            ) : (
                              <Typography color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteRecord(rec.id)}
                            >
                              <DeleteIcon sx={{ fontSize: '1rem' }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No committed calculation records found in estimate_plate table.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
