/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Divider,
  Alert,
  Snackbar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  CalculateOutlined as CalculateIcon,
  SaveOutlined as SaveIcon,
  DeleteOutlined as DeleteIcon,
  LayersOutlined as PlateIcon,
  PrintOutlined as RunIcon,
  AssignmentTurnedInOutlined as SavedIcon,
  HistoryEdu as HistoryIcon,
  Bolt as AutoIcon
} from '@mui/icons-material';

import { MachineApiService } from '../../../machines/services/api';
import { MachineMasterItem } from '../../../machines/types';
import { EstimateApiService } from '../../job-entry/services/api';
import { EstimateJob } from '../../job-entry/types';
import { PrintingCostApiService } from '../services/api';
import { PrintingCostInput, PrintingCostResult, EstimatePrintingCostRecord, MachineComparisonItem } from '../types';
import { PrintingCostValidator } from '../validation';

import PrintingCostSummaryCard from './PrintingCostSummaryCard';
import CostBreakdownCard from './CostBreakdownCard';
import MachineComparisonTable from './MachineComparisonTable';
import RecommendationCard from './RecommendationCard';

export default function PrintingCostWorkspace() {
  // --- MASTER DATA & LINKED STATES ---
  const [machines, setMachines] = useState<MachineMasterItem[]>([]);
  const [estimates, setEstimates] = useState<EstimateJob[]>([]);
  
  // --- SELECTION STATES ---
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>('');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  
  // --- INPUT STATES ---
  const [plateCount, setPlateCount] = useState<number>(4);
  const [plateRate, setPlateRate] = useState<number>(1000);
  const [totalImpressions, setTotalImpressions] = useState<number>(10000);
  const [printChargePer1000, setPrintChargePer1000] = useState<number>(150);
  const [runningTimeHours, setRunningTimeHours] = useState<number>(2);
  const [runningTimeMinutes, setRunningTimeMinutes] = useState<number>(0);
  const [totalMachineSheets, setTotalMachineSheets] = useState<number>(10000);

  // --- ANALYSIS STATE ---
  const [activeResult, setActiveResult] = useState<PrintingCostResult | null>(null);
  const [comparisons, setComparisons] = useState<MachineComparisonItem[]>([]);
  const [history, setHistory] = useState<EstimatePrintingCostRecord[]>([]);

  // --- UX & STATUS STATES ---
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<any>({});
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Load Initial Data
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const machList = await MachineApiService.getMachines({ status: 'Active' });
        setMachines(machList);

        const estList = await EstimateApiService.getEstimates();
        setEstimates(estList);

        const hist = await PrintingCostApiService.getRecords();
        setHistory(hist);
      } catch (err) {
        console.error('Error loading master data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Sync Input fields when selected estimate/job changes
  useEffect(() => {
    if (!selectedEstimateId) return;

    const matchedEst = estimates.find((e) => e.id === selectedEstimateId);
    if (!matchedEst) return;

    // Fetch Linked Plates Record
    let pCount = 4;
    let pRate = 1000;
    const platesStr = localStorage.getItem('printopia_estimate_plates') || '[]';
    try {
      const savedPlates = JSON.parse(platesStr);
      // Find matching plate count for the active job
      const matchingPlate = savedPlates.find((p: any) => p.estimateId === selectedEstimateId || p.machineId === matchedEst.machineId);
      if (matchingPlate) {
        pCount = matchingPlate.totalPlateCount;
        pRate = matchingPlate.plateCostPerPlate;
      }
    } catch (e) {
      console.error('Error matching plates record:', e);
    }

    // Fetch Linked Impression Record
    let imps = 10000;
    let runH = 2;
    let runM = 0;
    let mSheets = 10000;
    const impsStr = localStorage.getItem('printopia_estimate_impressions') || '[]';
    try {
      const savedImps = JSON.parse(impsStr);
      const matchingImp = savedImps.find((i: any) => i.estimateId === selectedEstimateId || i.machineId === matchedEst.machineId);
      if (matchingImp) {
        imps = matchingImp.grandTotalImpressions;
        runH = matchingImp.runningTimeHours;
        runM = matchingImp.runningTimeMinutes;
        mSheets = matchingImp.totalMachineSheets || matchingImp.grandTotalImpressions;
      }
    } catch (e) {
      console.error('Error matching impressions record:', e);
    }

    // Resolve machine details from the matched machine
    const matchedMachine = machines.find((m) => m.id === matchedEst.machineId) || machines[0];
    const machineIdToSet = matchedMachine ? matchedMachine.id : '';
    const runCharge = matchedMachine ? matchedMachine.printChargePer1000 : 150;

    setSelectedMachineId(machineIdToSet);
    setPlateCount(pCount);
    setPlateRate(pRate);
    setTotalImpressions(imps);
    setPrintChargePer1000(runCharge);
    setRunningTimeHours(runH);
    setRunningTimeMinutes(runM);
    setTotalMachineSheets(mSheets);

    // Trigger instant calculations
    triggerLiveCalculation({
      machineId: machineIdToSet,
      plateCount: pCount,
      plateRate: pRate,
      totalImpressions: imps,
      printChargePer1000: runCharge,
      runningTimeHours: runH,
      runningTimeMinutes: runM,
      totalMachineSheets: mSheets
    });
  }, [selectedEstimateId, estimates, machines]);

  // Sync plateRate and printChargePer1000 when selectedMachineId changes manually
  const handleMachineChange = (machId: string) => {
    setSelectedMachineId(machId);
    const m = machines.find((mach) => mach.id === machId);
    if (m) {
      const pRate = m.plateCost || 1000;
      const rCharge = m.printChargePer1000 || 150;
      setPlateRate(pRate);
      setPrintChargePer1000(rCharge);

      // Trigger automatic live updates
      triggerLiveCalculation({
        machineId: machId,
        plateCount,
        plateRate: pRate,
        totalImpressions,
        printChargePer1000: rCharge,
        runningTimeHours,
        runningTimeMinutes,
        totalMachineSheets
      });
    }
  };

  // Helper function to calculate costs instantly
  const triggerLiveCalculation = (overrideInput?: Partial<PrintingCostInput>) => {
    const activeInput: PrintingCostInput = {
      machineId: overrideInput?.machineId ?? selectedMachineId,
      plateCount: overrideInput?.plateCount ?? plateCount,
      plateRate: overrideInput?.plateRate ?? plateRate,
      totalImpressions: overrideInput?.totalImpressions ?? totalImpressions,
      printChargePer1000: overrideInput?.printChargePer1000 ?? printChargePer1000,
      runningTimeHours: overrideInput?.runningTimeHours ?? runningTimeHours,
      runningTimeMinutes: overrideInput?.runningTimeMinutes ?? runningTimeMinutes,
      totalMachineSheets: overrideInput?.totalMachineSheets ?? totalMachineSheets
    };

    const validation = PrintingCostValidator.validate(activeInput);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors({});

    const result = PrintingCostApiService.calculatePrintingCost(activeInput);
    setActiveResult(result);

    // Compute alternative machine comparison
    // Use target quantity from active estimate if possible, fallback to 10000
    const matchedEst = estimates.find((e) => e.id === selectedEstimateId);
    const qty = matchedEst ? matchedEst.finalQuantity : 10000;

    PrintingCostApiService.compareMachines(qty, activeInput.plateCount, activeInput.totalImpressions)
      .then((comparisonResults) => {
        setComparisons(comparisonResults);
      })
      .catch((err) => console.error(err));
  };

  // Trigger calculation when input fields lose focus or change
  const handleLiveCalculation = () => {
    triggerLiveCalculation();
  };

  // Auto apply best machine
  const handleApplyBestMachine = (machId: string) => {
    handleMachineChange(machId);
    setNotification({
      open: true,
      message: 'Successfully applied the recommended most cost-effective machine!',
      severity: 'success'
    });
  };

  // Save Record
  const handleSaveResult = async () => {
    const activeInput: PrintingCostInput = {
      estimateId: selectedEstimateId || undefined,
      machineId: selectedMachineId,
      plateCount,
      plateRate,
      totalImpressions,
      printChargePer1000,
      runningTimeHours,
      runningTimeMinutes,
      totalMachineSheets
    };

    const validation = PrintingCostValidator.validate(activeInput);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setNotification({
        open: true,
        message: 'Please resolve errors on the configuration form first.',
        severity: 'error'
      });
      return;
    }

    setIsLoading(true);
    try {
      const record = await PrintingCostApiService.calculateAndSave(activeInput);
      setNotification({
        open: true,
        message: `Successfully saved printing cost calculations! Record Reference: ${record.id}`,
        severity: 'success'
      });
      // Refresh local history database
      const hist = await PrintingCostApiService.getRecords();
      setHistory(hist);
    } catch (err: any) {
      setNotification({
        open: true,
        message: err.message || 'An error occurred while saving.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Record
  const handleDeleteRecord = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await PrintingCostApiService.deleteRecord(id);
      setNotification({
        open: true,
        message: 'Saved calculation record deleted successfully.',
        severity: 'warning'
      });
      const hist = await PrintingCostApiService.getRecords();
      setHistory(hist);
    } catch (err) {
      console.error(err);
    }
  };

  // Load saved record from history
  const handleLoadHistoryRecord = (record: EstimatePrintingCostRecord) => {
    setSelectedEstimateId(record.estimateId || '');
    setSelectedMachineId(record.machineId);
    setPlateCount(record.plateCount);
    setPlateRate(record.plateRate);
    setTotalImpressions(record.totalImpressions);
    setPrintChargePer1000(record.printChargePer1000);
    setRunningTimeHours(record.runningTimeHours);
    setRunningTimeMinutes(record.runningTimeMinutes);
    setTotalMachineSheets(record.totalMachineSheets);

    // Apply active pre-calculated results
    setActiveResult({
      plateCost: record.plateCost,
      printingCost: record.printingCost,
      runningCost: record.runningCost,
      totalPrintingCost: record.totalPrintingCost,
      costPerImpression: record.costPerImpression,
      costPerSheet: record.costPerSheet
    });

    setNotification({
      open: true,
      message: `Loaded saved record from ${new Date(record.createdAt).toLocaleDateString()}`,
      severity: 'success'
    });
  };

  // Trigger live calculation on startup or when selection changes
  useEffect(() => {
    if (selectedMachineId) {
      triggerLiveCalculation();
    }
  }, [selectedMachineId]);

  return (
    <Box id="printing-cost-workspace" sx={{ p: 1 }}>
      {/* Title Header banner */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalculateIcon color="primary" sx={{ fontSize: '2rem' }} /> Estimate Printing Cost Engine
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Perform high-fidelity offset printing run costing simulations mapped with Plate specs & Impression outputs
          </Typography>
        </Box>
        {isLoading && <CircularProgress size={24} />}
      </Box>

      {/* Main Grid layout */}
      <Grid container spacing={3}>
        {/* Left Column: Cost Configurations */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.02)', mb: 3 }}>
            <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'primary.lighter', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'black', color: 'primary.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoIcon /> Cost Optimization Parameters
              </Typography>
              <Chip label="Configurable" color="primary" size="small" variant="outlined" sx={{ fontWeight: 'bold' }} />
            </Box>

            <CardContent sx={{ p: 3 }}>
              {/* Linked Job selector */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    select
                    fullWidth
                    label="Link Estimate / Job (Preloads plates & impressions)"
                    value={selectedEstimateId}
                    onChange={(e) => setSelectedEstimateId(e.target.value)}
                    helperText="Select a completed Job Entry to auto-load computed Plate & Impression volumes"
                  >
                    <MenuItem value="">
                      <em>-- Manual Standalone Mode (No Linked Estimate) --</em>
                    </MenuItem>
                    {estimates.map((est) => (
                      <MenuItem key={est.id} value={est.id}>
                        {est.estimateNumber} - {est.customerName} ({est.productName})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Machine Selection dropdown */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    select
                    fullWidth
                    label="Select Machine"
                    value={selectedMachineId}
                    onChange={(e) => handleMachineChange(e.target.value)}
                    error={!!validationErrors.machineId}
                    helperText={validationErrors.machineId || "Default Plate Rate & Printing Run Charge will load from selected press"}
                  >
                    <MenuItem value="" disabled>
                      Select an Active Machine
                    </MenuItem>
                    {machines.map((mach) => (
                      <MenuItem key={mach.id} value={mach.id}>
                        {mach.machineName} ({mach.machineCode}) - speed: {mach.avgSpeed} SPH
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 3 }} />

              {/* Configure numerical inputs */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    type="number"
                    fullWidth
                    label="Plate Count"
                    value={plateCount}
                    onChange={(e) => {
                      setPlateCount(Math.max(0, parseInt(e.target.value) || 0));
                    }}
                    onBlur={handleLiveCalculation}
                    error={!!validationErrors.plateCount}
                    helperText={validationErrors.plateCount || "Number of plates needed"}
                    slotProps={{
                      input: {
                        startAdornment: <PlateIcon sx={{ color: 'action.active', mr: 1, fontSize: '1.2rem' }} />
                      }
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    type="number"
                    fullWidth
                    label="Plate Cost / Rate (Rs.)"
                    value={plateRate}
                    onChange={(e) => {
                      setPlateRate(Math.max(0, parseFloat(e.target.value) || 0));
                    }}
                    onBlur={handleLiveCalculation}
                    helperText="Rate per individual plate unit"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    type="number"
                    fullWidth
                    label="Total Impression Count"
                    value={totalImpressions}
                    onChange={(e) => {
                      setTotalImpressions(Math.max(0, parseInt(e.target.value) || 0));
                    }}
                    onBlur={handleLiveCalculation}
                    error={!!validationErrors.totalImpressions}
                    helperText={validationErrors.totalImpressions || "Cylinder Press Impressions stroke counts"}
                    slotProps={{
                      input: {
                        startAdornment: <RunIcon sx={{ color: 'action.active', mr: 1, fontSize: '1.2rem' }} />
                      }
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    type="number"
                    fullWidth
                    label="Printing Charge (Per 1000 Imps)"
                    value={printChargePer1000}
                    onChange={(e) => {
                      setPrintChargePer1000(Math.max(0, parseFloat(e.target.value) || 0));
                    }}
                    onBlur={handleLiveCalculation}
                    helperText="Press running rate per 1000 passes"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      type="number"
                      label="Run Time Hours"
                      value={runningTimeHours}
                      onChange={(e) => setRunningTimeHours(Math.max(0, parseInt(e.target.value) || 0))}
                      onBlur={handleLiveCalculation}
                      fullWidth
                    />
                    <TextField
                      type="number"
                      label="Minutes"
                      value={runningTimeMinutes}
                      onChange={(e) => setRunningTimeMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      onBlur={handleLiveCalculation}
                      fullWidth
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, px: 0.5 }}>
                    Press running duration
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    type="number"
                    fullWidth
                    label="Total Machine Sheets"
                    value={totalMachineSheets}
                    onChange={(e) => {
                      setTotalMachineSheets(Math.max(0, parseInt(e.target.value) || 0));
                    }}
                    onBlur={handleLiveCalculation}
                    helperText="Required to compute precise Unit Cost Per Sheet"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<CalculateIcon />}
                  onClick={() => triggerLiveCalculation()}
                  sx={{ borderRadius: 2, fontWeight: 'bold', textTransform: 'none' }}
                >
                  Recalculate Costs
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveResult}
                  disabled={isLoading}
                  sx={{ borderRadius: 2, fontWeight: 'bold', textTransform: 'none' }}
                >
                  Commit to Database
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Calculations & Breakdown */}
        <Grid size={{ xs: 12, md: 5 }}>
          {activeResult ? (
            <Stack spacing={3}>
              {/* Core summary KPI */}
              <PrintingCostSummaryCard
                plateCost={activeResult.plateCost}
                printingCost={activeResult.printingCost}
                runningCost={activeResult.runningCost}
                totalPrintingCost={activeResult.totalPrintingCost}
                costPerImpression={activeResult.costPerImpression}
                costPerSheet={activeResult.costPerSheet}
                plateCount={plateCount}
                totalImpressions={totalImpressions}
                machineName={machines.find((m) => m.id === selectedMachineId)?.machineName || 'Selected Machine'}
              />

              {/* Breakdown charts */}
              <CostBreakdownCard
                plateCost={activeResult.plateCost}
                printingCost={activeResult.printingCost}
                totalPrintingCost={activeResult.totalPrintingCost}
                costPerSheet={activeResult.costPerSheet}
                costPerPiece={activeResult.costPerImpression}
                runningTimeHours={runningTimeHours}
                runningTimeMinutes={runningTimeMinutes}
              />
            </Stack>
          ) : (
            <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: 'action.hover' }}>
              <CalculateIcon sx={{ fontSize: '3rem', color: 'text.secondary', mb: 1.5 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Configure and Calculate Printing Costs
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 300, mt: 0.5 }}>
                Select a machine and define setup parameters on the left to review instantaneous cost distributions.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Alternative Machine Comparisons & Recommendation Section */}
      {comparisons.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Grid container spacing={3}>
            {/* Machine Table list */}
            <Grid size={{ xs: 12, lg: 8 }}>
              <MachineComparisonTable
                comparisons={comparisons}
                selectedMachineId={selectedMachineId}
                onSelectMachine={handleMachineChange}
              />
            </Grid>

            {/* Smart Recommendation Card */}
            <Grid size={{ xs: 12, lg: 4 }}>
              <RecommendationCard
                comparisons={comparisons}
                selectedMachineId={selectedMachineId}
                onApplyBestMachine={handleApplyBestMachine}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Saved Database Calculation logs history */}
      {history.length > 0 && (
        <Box sx={{ mt: 5 }}>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon color="action" />
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Saved Costing Simulation Records (estimate_printing_cost)
            </Typography>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Ref Code / Job</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Simulated Machine</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Impressions</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Plates Cost</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Running Cost</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Cost</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Saved At</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((rec) => (
                  <TableRow
                    key={rec.id}
                    hover
                    onClick={() => handleLoadHistoryRecord(rec)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {rec.id}
                        </Typography>
                        <Typography variant="caption" color="primary.main">
                          {rec.estimateNumber ? `Job: ${rec.estimateNumber}` : 'Manual Entry'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {rec.machineName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{rec.totalImpressions.toLocaleString()}</TableCell>
                    <TableCell align="right">Rs. {Math.round(rec.plateCost).toLocaleString()}</TableCell>
                    <TableCell align="right">Rs. {Math.round(rec.printingCost).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'black', color: 'primary.dark' }}>
                      Rs. {Math.round(rec.totalPrintingCost).toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="caption" color="text.secondary">
                        {new Date(rec.createdAt).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="error"
                        size="small"
                        onClick={(e) => handleDeleteRecord(rec.id, e)}
                        sx={{ border: '1px solid', borderColor: 'error.light', borderRadius: 2 }}
                      >
                        <DeleteIcon sx={{ fontSize: '1.1rem' }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Toast notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          severity={notification.severity}
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
          sx={{ borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
