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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton
} from '@mui/material';
import {
  Speed as SpeedIcon,
  AutoAwesome as SparklesIcon,
  Tune as SettingsIcon,
  Save as SaveIcon,
  ImportContacts as ImportIcon,
  DeleteOutlined as DeleteIcon,
  CheckCircle as SuccessIcon,
  HelpOutlineOutlined as HelpIcon,
  Layers as ImpressionsIcon
} from '@mui/icons-material';

import { ImpressionApiService } from '../services/api';
import { ImpressionEngineValidator, ImpressionValidationError } from '../validation';
import { ImpressionCalculationInput, EstimateImpressionRecord } from '../types';

import { MachineApiService } from '../../../machines/services/api';
import { EstimateApiService } from '../../job-entry/services/api';
import { MachineMasterItem, PrintingMethod } from '../../../machines/types';
import { EstimateJob } from '../../job-entry/types';

import ImpressionSummaryCard from './ImpressionSummaryCard';
import ImpressionAnalysisPanel from './ImpressionAnalysisPanel';

export default function ImpressionWorkspace() {
  // --- MASTER DATA STATES ---
  const [estimateJobs, setEstimateJobs] = useState<EstimateJob[]>([]);
  const [machines, setMachines] = useState<MachineMasterItem[]>([]);
  const [savedLayouts, setSavedLayouts] = useState<any[]>([]);
  
  // --- INPUT STATES ---
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
  const [machineId, setMachineId] = useState<string>('');
  const [printingMethod, setPrintingMethod] = useState<PrintingMethod>('Sheetwise');
  const [quantity, setQuantity] = useState<number>(5000);
  
  // Wastage details (Editable overrides!)
  const [registerWastage, setRegisterWastage] = useState<string>('');
  const [makeReadyWastage, setMakeReadyWastage] = useState<string>('');
  const [productionWastagePercent, setProductionWastagePercent] = useState<string>('1.5');

  // --- UI STATES ---
  const [activeRecord, setActiveRecord] = useState<EstimateImpressionRecord | null>(null);
  const [savedRecords, setSavedRecords] = useState<EstimateImpressionRecord[]>([]);
  
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<ImpressionValidationError>({});
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
          setRegisterWastage(String(machinesList[0].registerWastage || 50));
          setMakeReadyWastage(String(machinesList[0].makeReadyWastage || 100));
        }

        // Load layouts from Paper Intelligence
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

        // Load saved impression records (GET /estimate/impression)
        const records = await ImpressionApiService.getImpressionRecords();
        setSavedRecords(records);
      } catch (err) {
        console.error('Error loading Master Data in Impression Workspace:', err);
        setErrorMessage('Failed to load Master databases. Please ensure machine and estimates registries are active.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // --- SYNCHRONIZE DEFAULTS WHEN SELECTED MACHINE CHANGES ---
  const handleMachineChange = (mId: string) => {
    setMachineId(mId);
    const mMatch = machines.find((m) => m.id === mId);
    if (mMatch) {
      setRegisterWastage(String(mMatch.registerWastage || 50));
      setMakeReadyWastage(String(mMatch.makeReadyWastage || 100));
    }
  };

  // --- RE-CALCULATE DYNAMICALLY ---
  const runImpressionEngine = () => {
    setErrorMessage('');
    setValidationErrors({});

    const input: ImpressionCalculationInput = {
      machineId,
      layoutId: selectedLayoutId || undefined,
      printingMethod,
      quantity,
      frontColors: 4, // placeholder
      backColors: 0,
      printingSide: 'Single Side',
      registerWastage: registerWastage !== '' ? Number(registerWastage) : undefined,
      makeReadyWastage: makeReadyWastage !== '' ? Number(makeReadyWastage) : undefined,
      productionWastagePercent: productionWastagePercent !== '' ? Number(productionWastagePercent) : undefined
    };

    const validation = ImpressionEngineValidator.validate(input);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setActiveRecord(null);
      return;
    }

    try {
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

      // Check linked plates calculations to get exact colors and side configs if possible
      let frontColors = 4;
      let backColors = 0;
      let printingSide: 'Single Side' | 'Both Side' = 'Single Side';

      const savedPlatesStr = localStorage.getItem('printopia_estimate_plates') || '[]';
      try {
        const plates = JSON.parse(savedPlatesStr);
        const matchedPlate = plates.find((p: any) => p.machineId === machineId && p.selectedLayoutId === selectedLayoutId);
        if (matchedPlate) {
          frontColors = matchedPlate.frontColors;
          backColors = matchedPlate.backColors;
          printingSide = matchedPlate.printingSide;
        }
      } catch (e) {
        console.error(e);
      }

      // Update input configurations with matched metadata
      input.frontColors = frontColors;
      input.backColors = backColors;
      input.printingSide = printingSide;

      const result = ImpressionApiService.calculateImpressions(
        input,
        machine.registerWastage || 50,
        machine.makeReadyWastage || 100,
        machine.avgSpeed || 5000,
        ups,
        machineSheetsPerParent
      );

      setActiveRecord({
        id: 'temp-impression-record',
        machineId,
        machineName: machine.machineName,
        machineCode: machine.machineCode,
        printingMethod,
        printingSide,
        frontColors,
        backColors,
        quantity,
        layoutId: selectedLayoutId || undefined,
        parentSheetName,
        machineSheetSize,
        ups,
        machineSheetsPerParent,
        runningSheets: result.runningSheets,
        registerSheets: result.registerSheets,
        makeReadySheets: result.makeReadySheets,
        productionWastage: result.productionWastage,
        totalMachineSheets: result.totalMachineSheets,
        totalParentSheets: result.totalParentSheets,
        frontImpressions: result.frontImpressions,
        backImpressions: result.backImpressions,
        grandTotalImpressions: result.grandTotalImpressions,
        avgSpeed: result.avgSpeed,
        totalPasses: result.totalPasses,
        totalFeedSheets: result.totalFeedSheets,
        runningTimeHours: result.runningTimeHours,
        runningTimeMinutes: result.runningTimeMinutes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred during calculation.');
    }
  };

  // Run calculation dynamically whenever inputs change
  useEffect(() => {
    if (machineId && quantity > 0) {
      runImpressionEngine();
    }
  }, [
    machineId,
    selectedLayoutId,
    printingMethod,
    quantity,
    registerWastage,
    makeReadyWastage,
    productionWastagePercent,
    savedLayouts
  ]);

  // --- SAVE ACTIVE RECORD TO LOCALSTORAGE ---
  const handleSaveRecord = async () => {
    if (!activeRecord) return;
    try {
      const input: ImpressionCalculationInput = {
        estimateId: selectedJobId || undefined,
        machineId: activeRecord.machineId,
        layoutId: activeRecord.layoutId,
        printingMethod: activeRecord.printingMethod,
        quantity: activeRecord.quantity,
        frontColors: activeRecord.frontColors,
        backColors: activeRecord.backColors,
        printingSide: activeRecord.printingSide,
        registerWastage: activeRecord.registerSheets,
        makeReadyWastage: activeRecord.makeReadySheets,
        productionWastagePercent: Number(productionWastagePercent)
      };

      // Call POST /estimate/impression
      await ImpressionApiService.calculateAndSave(input);
      setSaveSuccess(true);
      
      // Reload logs
      const updatedList = await ImpressionApiService.getImpressionRecords();
      setSavedRecords(updatedList);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to persist impression calculation record.');
    }
  };

  // --- DELETE LOG RECORD ---
  const handleDeleteRecord = async (id: string) => {
    try {
      await ImpressionApiService.deleteImpressionRecord(id);
      const updatedList = await ImpressionApiService.getImpressionRecords();
      setSavedRecords(updatedList);
      setInfoMessage('Impression log entry removed.');
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

    if (job.machineId) {
      setMachineId(job.machineId);
      const mMatch = machines.find((m) => m.id === job.machineId);
      if (mMatch) {
        setRegisterWastage(String(mMatch.registerWastage || 50));
        setMakeReadyWastage(String(mMatch.makeReadyWastage || 100));
      }
    }

    // Try to auto-match layout
    const relatedLayout = savedLayouts.find((l) => l.machineId === job.machineId);
    if (relatedLayout) {
      setSelectedLayoutId(relatedLayout.id);
    }

    // Try to auto-match printing method computed in Plates step
    const savedPlatesStr = localStorage.getItem('printopia_estimate_plates') || '[]';
    try {
      const plates = JSON.parse(savedPlatesStr);
      const matchedPlate = plates.find((p: any) => p.machineId === job.machineId && p.selectedLayoutId === relatedLayout?.id);
      if (matchedPlate) {
        setPrintingMethod(matchedPlate.selectedMethod);
      }
    } catch (e) {
      console.error(e);
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
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2, fontWeight: 'bold' }}>
          Impression calculation successfully written to estimate_impression database log!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Panel: Inputs & Parameter Tuning */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={3}>
            {/* Import Spec Linkage */}
            <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'secondary.light', bgcolor: 'secondary.lighter' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" color="secondary.dark" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ImportIcon /> Step 1: Link Estimate Specs
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
                  <SettingsIcon color="secondary" /> Configure Waste & SPH
                </Typography>
                <Chip label="Configurable" color="secondary" size="small" sx={{ fontWeight: 'bold', height: 18, fontSize: '0.62rem' }} />
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                  {/* Select Paper Intelligence Layout */}
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Select Layout (Required)*"
                    value={selectedLayoutId}
                    onChange={(e) => setSelectedLayoutId(e.target.value)}
                    error={!!validationErrors.layoutId}
                    helperText={validationErrors.layoutId || "Loads cutting ups and sheet parent mappings"}
                    required
                  >
                    <MenuItem value="">-- Select computed layout --</MenuItem>
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

                  {/* Printing Method Toggle */}
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Printing Method Required*"
                    value={printingMethod}
                    onChange={(e) => setPrintingMethod(e.target.value as PrintingMethod)}
                    error={!!validationErrors.printingMethod}
                    helperText={validationErrors.printingMethod}
                    required
                  >
                    <MenuItem value="Sheetwise">Sheetwise (2 separate pass sets)</MenuItem>
                    <MenuItem value="Work & Turn">Work & Turn (Combined horizontal turn)</MenuItem>
                    <MenuItem value="Work & Tumble">Work & Tumble (Combined vertical tumble)</MenuItem>
                    <MenuItem value="Perfecting">Perfecting (Single pass duplex)</MenuItem>
                  </TextField>

                  {/* Run quantity */}
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Final Delivery Quantity (Print Copies)*"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    error={!!validationErrors.quantity}
                    helperText={validationErrors.quantity}
                    required
                  />

                  <Divider>
                    <Chip label="Tolerances & Overrides" size="small" variant="outlined" />
                  </Divider>

                  {/* Wastage parameters */}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Register Waste (Sheets)"
                        value={registerWastage}
                        onChange={(e) => setRegisterWastage(e.target.value)}
                        helperText="Plate registering run"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Make Ready Waste (Sheets)"
                        value={makeReadyWastage}
                        onChange={(e) => setMakeReadyWastage(e.target.value)}
                        helperText="Color ink alignment sheets"
                      />
                    </Grid>
                  </Grid>

                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Production Spoilage Wastage (%)"
                    value={productionWastagePercent}
                    onChange={(e) => setProductionWastagePercent(e.target.value)}
                    helperText="Spoilage percent during full run"
                  />
                </Stack>
              </CardContent>
            </Card>

            {/* Educational Info box */}
            <Box sx={{ p: 2, bgcolor: 'action.disabledBackground', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <HelpIcon color="secondary" sx={{ fontSize: '1.1rem' }} /> Offset Impression Wisdom
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                - <strong>Perfecting</strong> presses save press runtime because sheets receive front & back ink simultaneously. The total press run impressions are exactly equal to the machine sheets.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                - <strong>Sheetwise, Work & Turn, and Work & Tumble</strong> require feeding the total machine sheets twice (Pass multiplier = 2). Thus, total impressions on the press counter are doubled.
              </Typography>
            </Box>
          </Stack>
        </Grid>

        {/* Right Panel: Output, Recommendations & Saved Logs */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={3}>
            {activeRecord ? (
              <>
                {/* Summary Card */}
                <ImpressionSummaryCard record={activeRecord} />

                {/* Recommendation and Conversion Rule Details */}
                <ImpressionAnalysisPanel record={activeRecord} />

                {/* Commit Action Panel */}
                <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                      Commit Calculated Impressions
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Lock calculation results to database log for downstream estimation.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveRecord}
                    sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 'bold' }}
                  >
                    Commit Impression Specs
                  </Button>
                </Card>
              </>
            ) : (
              <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justify: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 3, height: '100%', minHeight: 300 }}>
                <ImpressionsIcon sx={{ fontSize: '4rem', color: 'text.secondary', mb: 1.5 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  Impression Calculation Suspended
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 360 }}>
                  Adjust required parameters, select a layout, and choose a press on the left panel to trigger the Impression Engine calculations.
                </Typography>
              </Box>
            )}

            {/* Saved database records: estimate_impression */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                  Database Records: estimate_impression
                </Typography>
              </Box>
              <TableContainer sx={{ maxHeight: 280 }}>
                <Table stickyHeader size="small" aria-label="saved impression calculation logs">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Job Card</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Press</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Method</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Machine Sheets</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Grand Total Imp</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Runtime</TableCell>
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
                            <Chip label={rec.printingMethod} size="small" color="secondary" variant="outlined" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 'bold' }} />
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>{rec.totalMachineSheets.toLocaleString()}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', color: 'secondary.dark' }}>
                            {rec.grandTotalImpressions.toLocaleString()}
                          </TableCell>
                          <TableCell align="center">
                            {rec.runningTimeHours}h {rec.runningTimeMinutes}m
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
                          No committed calculation records found in estimate_impression table.
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
