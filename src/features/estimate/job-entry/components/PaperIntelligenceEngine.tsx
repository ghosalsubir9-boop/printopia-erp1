/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper as MuiPaper,
  Slider,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  Stack,
  Divider,
  Collapse
} from '@mui/material';
import {
  AutoAwesome as AutoIcon,
  CheckCircle as CheckIcon,
  Tune as SettingsIcon,
  HelpOutlined as HelpIcon,
  CompareArrows as CompareIcon,
  Speed as SpeedIcon,
  RestoreFromTrash as ResetIcon,
  ImportContacts as ImportIcon,
  Save as SaveIcon,
  Layers as LayersIcon,
  Dashboard as VisualsIcon,
  Scale as WeightIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';

import { PaperIntelligenceService, EstimateLayout, LayoutCalculationInput } from '../services/layoutApi';
import { EstimateApiService } from '../services/api';
import { PaperApiService } from '../../../paper-master/services/api';
import { MachineApiService } from '../../../machines/services/api';
import { ProductApiService } from '../../../product-master/services/api';

import { EstimateJob } from '../types';
import { PaperMasterItem, PaperGSM } from '../../../paper-master/types';
import { MachineMasterItem } from '../../../machines/types';
import { ProductMasterItem } from '../../../product-master/types';

export default function PaperIntelligenceEngine() {
  // --- STATE FOR MASTER DATA ---
  const [estimateJobs, setEstimateJobs] = useState<EstimateJob[]>([]);
  const [papers, setPapers] = useState<PaperMasterItem[]>([]);
  const [gsms, setGSMs] = useState<PaperGSM[]>([]);
  const [machines, setMachines] = useState<MachineMasterItem[]>([]);
  const [products, setProducts] = useState<ProductMasterItem[]>([]);

  // --- JOB INPUT STATES ---
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [finishedWidth, setFinishedWidth] = useState<number>(9.0);
  const [finishedHeight, setFinishedHeight] = useState<number>(12.0);
  const [openWidth, setOpenWidth] = useState<number>(18.0);
  const [openHeight, setOpenHeight] = useState<number>(12.0);
  const [sizeUnit, setSizeUnit] = useState<'inch' | 'mm'>('inch');
  const [quantity, setQuantity] = useState<number>(5000);
  const [paperId, setPaperId] = useState<string>('');
  const [gsmId, setGsmId] = useState<string>('');
  const [printingSide, setPrintingSide] = useState<'Single Side' | 'Both Side'>('Single Side');
  const [manualMachineId, setManualMachineId] = useState<string>(''); // empty means auto-all

  // --- WASTAGE PARAMETERS STATE (WITH RE-ACTIVE CALCULATION SLIDERS) ---
  const [registerWastage, setRegisterWastage] = useState<number>(50);
  const [makeReadyWastage, setMakeReadyWastage] = useState<number>(150);
  const [productionWastagePercent, setProductionWastagePercent] = useState<number>(2.0);
  const [isWastageExpanded, setIsWastageExpanded] = useState<boolean>(true);

  // --- ENGINE RESULTS STATES ---
  const [calculatedLayouts, setCalculatedLayouts] = useState<EstimateLayout[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
  const [recommendationPref, setRecommendationPref] = useState<'lowest_waste' | 'fastest_machine' | 'lowest_sheets'>('lowest_waste');
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // --- INITIAL LOADING ---
  useEffect(() => {
    async function loadMasters() {
      try {
        const jobsList = await EstimateApiService.getEstimates();
        setEstimateJobs(jobsList);

        const papersList = await PaperApiService.getPapers({ status: 'Active' });
        setPapers(papersList);
        if (papersList.length > 0) {
          setPaperId(papersList[0].id);
        }

        const gsmsList = await PaperApiService.getGSMs();
        setGSMs(gsmsList);
        if (gsmsList.length > 0) {
          setGsmId(gsmsList[0].id);
        }

        const machinesList = await MachineApiService.getMachines({ status: 'Active' });
        setMachines(machinesList);

        const productsList = await ProductApiService.getProducts({ status: 'Active' });
        setProducts(productsList);
      } catch (err) {
        console.error('Error loading master data in Paper Intelligence Engine:', err);
        setErrorMessage('Failed to load Master database. Please ensure Paper, Machine, and Product Masters are populated.');
      }
    }
    loadMasters();
  }, []);

  // --- HANDLE IMPORT FROM REGISTRY ---
  const handleImportJob = (jobId: string) => {
    setSelectedJobId(jobId);
    if (!jobId) return;

    const job = estimateJobs.find((j) => j.id === jobId);
    if (!job) return;

    setFinishedWidth(job.finishedWidth);
    setFinishedHeight(job.finishedHeight);
    setOpenWidth(job.openWidth || job.finishedWidth);
    setOpenHeight(job.openHeight || job.finishedHeight);
    setSizeUnit(job.sizeUnit);
    setQuantity(job.finalQuantity || job.orderQuantity);
    setPrintingSide(job.printingType === 'Both Side' ? 'Both Side' : 'Single Side');
    
    // Attempt paper match
    const pMatch = papers.find((p) => p.paperName === job.paperName || p.id === job.paperId);
    if (pMatch) {
      setPaperId(pMatch.id);
    }

    // Attempt GSM match
    const gMatch = gsms.find((g) => g.gsmValue === job.gsmValue || g.id === job.gsmId);
    if (gMatch) {
      setGsmId(gMatch.id);
    }

    // Attempt Machine match
    const mMatch = machines.find((m) => m.machineName === job.machineName || m.id === job.machineId);
    if (mMatch) {
      setManualMachineId(mMatch.id);
      // set wastage values based on machine master parameters
      setRegisterWastage(mMatch.registerWastage);
      setMakeReadyWastage(mMatch.makeReadyWastage);
    } else {
      setManualMachineId('');
    }

    setInfoMessage(`Successfully imported parameters from Estimate ${job.estimateNumber}`);
    setTimeout(() => setInfoMessage(''), 4000);
  };

  // --- TRIGGER ENGINE CALCULATIONS ---
  const runIntelligenceEngine = async () => {
    setErrorMessage('');
    setSaveSuccess(false);

    if (!paperId) {
      setErrorMessage('Please select a Paper Type from the master database.');
      return;
    }
    if (!gsmId) {
      setErrorMessage('Please select a GSM from the library.');
      return;
    }
    if (openWidth <= 0 || openHeight <= 0) {
      setErrorMessage('Open Width and Height must be positive numbers.');
      return;
    }
    if (quantity <= 0) {
      setErrorMessage('Quantity must be greater than 0.');
      return;
    }

    try {
      const input: LayoutCalculationInput = {
        finishedWidth,
        finishedHeight,
        openWidth,
        openHeight,
        sizeUnit,
        quantity,
        paperId,
        gsmId,
        printingSide,
        machineId: manualMachineId || undefined,
        paperWastageSheets: registerWastage + makeReadyWastage + Math.ceil((quantity / 2) * (productionWastagePercent / 100))
      };

      // Trigger POST /estimate/layout
      const results = await PaperIntelligenceService.calculateLayouts(input);

      if (results.length === 0) {
        setCalculatedLayouts([]);
        setSelectedLayoutId('');
        setErrorMessage('No valid layouts found. The product open dimensions may exceed all active machine sheet limits, or are too small for active presses.');
        return;
      }

      // Add smart recommendations
      const recommendedResults = PaperIntelligenceService.recommendLayouts(results, recommendationPref);
      setCalculatedLayouts(recommendedResults);

      // Select the recommended layout as default active
      const recommended = recommendedResults.find((r) => r.isRecommended);
      if (recommended) {
        setSelectedLayoutId(recommended.id);
      } else {
        setSelectedLayoutId(recommendedResults[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An unexpected error occurred in the Paper Intelligence calculation.');
    }
  };

  // --- AUTOMATIC RECALCULATION ON WASTAGE OR RECOMMENDATION PREFERENCE CHANGE ---
  useEffect(() => {
    if (paperId && gsmId && openWidth > 0 && openHeight > 0) {
      runIntelligenceEngine();
    }
  }, [registerWastage, makeReadyWastage, productionWastagePercent, recommendationPref, manualMachineId, paperId, gsmId, openWidth, openHeight, sizeUnit, quantity, printingSide]);

  // --- SAVE LAYOUTS TO LOCALSTORAGE DATABASE ---
  const handleSaveLayouts = async () => {
    if (calculatedLayouts.length === 0) return;
    try {
      await PaperIntelligenceService.saveCalculatedLayouts(calculatedLayouts);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage('Failed to save layout configuration.');
    }
  };

  const selectedPaperObj = papers.find((p) => p.id === paperId);
  const filteredGSMs = selectedPaperObj
    ? gsms.filter((g) => selectedPaperObj.supportedGSMIds.includes(g.id))
    : gsms;

  // Get active selected layout for rendering & details
  const activeLayout = calculatedLayouts.find((l) => l.id === selectedLayoutId);

  // Draw interactive SVG Mockup of the Layout
  const renderLayoutVisualizer = (layout: EstimateLayout) => {
    // Canvas constraints
    const maxCanvasW = 340;
    const maxCanvasH = 260;

    // Dimensions
    const msW = layout.machineSheetWidthMm;
    const msH = layout.machineSheetHeightMm;

    // Scale factors to fit canvas perfectly while maintaining exact aspect ratio
    const scale = Math.min(maxCanvasW / msW, maxCanvasH / msH) * 0.92;

    const canvasW = msW * scale;
    const canvasH = msH * scale;

    const prW = layout.printableWidth * scale;
    const prH = layout.printableHeight * scale;

    // Center printable area on machine sheet
    const dx = (canvasW - prW) / 2;
    const dy = (canvasH - prH) / 2;

    // Calculate dimensions of an individual product up in mm
    const upW = sizeUnit === 'inch' ? openWidth * 25.4 : openWidth;
    const upH = sizeUnit === 'inch' ? openHeight * 25.4 : openHeight;

    const upW_scaled = upW * scale;
    const upH_scaled = upH * scale;

    // Layout configuration parser
    // We can show the grid items inside the printable area
    const isPortrait = layout.layoutType === 'Portrait';
    const isLandscape = layout.layoutType === 'Landscape';

    const upsList: React.JSX.Element[] = [];
    let keyIdx = 0;

    if (isPortrait) {
      const cols = Math.floor(layout.printableWidth / upW);
      const rows = Math.floor(layout.printableHeight / upH);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          upsList.push(
            <rect
              key={keyIdx++}
              x={dx + c * upW_scaled + 2}
              y={dy + r * upH_scaled + 2}
              width={upW_scaled - 4}
              height={upH_scaled - 4}
              rx={4}
              fill="rgba(37, 99, 235, 0.12)"
              stroke="#2563eb"
              strokeWidth={1.5}
            />
          );
          upsList.push(
            <text
              key={keyIdx++}
              x={dx + c * upW_scaled + upW_scaled / 2}
              y={dy + r * upH_scaled + upH_scaled / 2 + 3}
              fontSize="9"
              fontWeight="900"
              fill="#1d4ed8"
              textAnchor="middle"
            >
              Up {keyIdx / 2}
            </text>
          );
        }
      }
    } else if (isLandscape) {
      const cols = Math.floor(layout.printableWidth / upH);
      const rows = Math.floor(layout.printableHeight / upW);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          upsList.push(
            <rect
              key={keyIdx++}
              x={dx + c * upH_scaled + 2}
              y={dy + r * upW_scaled + 2}
              width={upH_scaled - 4}
              height={upW_scaled - 4}
              rx={4}
              fill="rgba(139, 92, 246, 0.12)"
              stroke="#8b5cf6"
              strokeWidth={1.5}
            />
          );
          upsList.push(
            <text
              key={keyIdx++}
              x={dx + c * upH_scaled + upH_scaled / 2}
              y={dy + r * upW_scaled + upW_scaled / 2 + 3}
              fontSize="9"
              fontWeight="900"
              fill="#6d28d9"
              textAnchor="middle"
            >
              Up {keyIdx / 2}
            </text>
          );
        }
      }
    } else {
      // Mixed Layout parser
      // Render simple bento boxes inside printable space based on ups count
      const numUps = layout.ups;
      const cols = Math.ceil(Math.sqrt(numUps));
      const rows = Math.ceil(numUps / cols);
      
      const itemW = prW / cols;
      const itemH = prH / rows;

      for (let i = 0; i < numUps; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        upsList.push(
          <rect
            key={keyIdx++}
            x={dx + c * itemW + 2}
            y={dy + r * itemH + 2}
            width={itemW - 4}
            height={itemH - 4}
            rx={4}
            fill="rgba(16, 185, 129, 0.12)"
            stroke="#10b981"
            strokeWidth={1.5}
          />
        );
        upsList.push(
          <text
            key={keyIdx++}
            x={dx + c * itemW + itemW / 2}
            y={dy + r * itemH + itemH / 2 + 3}
            fontSize="8"
            fontWeight="900"
            fill="#047857"
            textAnchor="middle"
          >
            Up {i + 1}
          </text>
        );
      }
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1 }}>
        <Box
          sx={{
            position: 'relative',
            width: maxCanvasW,
            height: maxCanvasH,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'action.disabledBackground',
            overflow: 'hidden'
          }}
        >
          <svg width={canvasW} height={canvasH} style={{ display: 'block' }}>
            {/* Machine Sheet Border */}
            <rect
              x={0}
              y={0}
              width={canvasW}
              height={canvasH}
              fill="white"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="4"
            />
            
            {/* Printable Margin Area */}
            <rect
              x={dx}
              y={dy}
              width={prW}
              height={prH}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={1}
            />

            {/* Individual Ups */}
            {upsList}
          </svg>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontWeight: 'bold', display: 'flex', gap: 2 }}>
          <span>Sheet Size: {layout.machineSheetWidth}″ × {layout.machineSheetHeight}″ ({layout.machineSheetWidthMm} × {layout.machineSheetHeightMm} mm)</span>
          <span>Printable: {layout.printableWidth} × {layout.printableHeight} mm</span>
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 0 }}>
      {/* Dynamic Master Notifications */}
      {infoMessage && <Alert severity="info" sx={{ mb: 2, borderRadius: 2, fontWeight: 'bold' }}>{infoMessage}</Alert>}
      {errorMessage && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontWeight: 'bold' }}>{errorMessage}</Alert>}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          Layout arrangements safely synchronized into estimate_layout database table!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Hand: Parameter Settings Form & Wastage Controls */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={3}>
            {/* Import shortcut card */}
            <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'primary.light', bgcolor: 'primary.lighter' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" color="primary.dark" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ImportIcon /> Import parameters from Registry
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Select Estimate Job to populate"
                  value={selectedJobId}
                  onChange={(e) => handleImportJob(e.target.value)}
                  sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
                >
                  <MenuItem value="">-- Select estimate spec card --</MenuItem>
                  {estimateJobs.map((j) => (
                    <MenuItem key={j.id} value={j.id}>
                      {j.estimateNumber} - {j.customerName} ({j.productName})
                    </MenuItem>
                  ))}
                </TextField>
              </CardContent>
            </Card>

            {/* Main Form Panel */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsIcon color="primary" /> Calculation Inputs
                </Typography>
                <Chip label="Configurable Engine" color="primary" size="small" sx={{ fontWeight: 'bold', height: 18, fontSize: '0.6rem' }} />
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                  {/* Size Unit */}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary', width: 100 }}>
                      Size Unit:
                    </Typography>
                    <Tabs
                      value={sizeUnit}
                      onChange={(_, v) => setSizeUnit(v)}
                      sx={{ minHeight: 28, height: 28, '& .MuiTab-root': { py: 0.5, px: 2, minHeight: 28, height: 28, fontSize: '0.75rem', fontWeight: 'bold' } }}
                    >
                      <Tab value="inch" label="Inches (″)" />
                      <Tab value="mm" label="Millimeters (mm)" />
                    </Tabs>
                  </Box>

                  {/* Open Product Dimensions */}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label={`Open Width (${sizeUnit})`}
                        value={openWidth}
                        onChange={(e) => setOpenWidth(Number(e.target.value))}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label={`Open Height (${sizeUnit})`}
                        value={openHeight}
                        onChange={(e) => setOpenHeight(Number(e.target.value))}
                      />
                    </Grid>
                  </Grid>

                  {/* Quantity */}
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Product Quantity (Run Copies)"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />

                  {/* Paper Type */}
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Paper Type"
                    value={paperId}
                    onChange={(e) => setPaperId(e.target.value)}
                  >
                    {papers.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.paperName} ({p.paperCode})
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* GSM select */}
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label={selectedPaperObj ? "Select Paper Weight (GSM)" : "Select Paper Type First"}
                    value={gsmId}
                    onChange={(e) => setGsmId(e.target.value)}
                    disabled={!selectedPaperObj}
                  >
                    <MenuItem value="">-- Select GSM --</MenuItem>
                    {filteredGSMs.map((g) => (
                      <MenuItem key={g.id} value={g.id}>
                        {g.gsmValue} GSM - {g.description || 'Standard weight'}
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Machine constraint (optional override) */}
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Limit to Specific Press (Optional)"
                    value={manualMachineId}
                    onChange={(e) => setManualMachineId(e.target.value)}
                  >
                    <MenuItem value="">-- Auto-select across all presses --</MenuItem>
                    {machines.map((m) => (
                      <MenuItem key={m.id} value={m.id}>
                        {m.machineName} ({m.machineCode})
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </CardContent>
            </Card>

            {/* Wastage slider panel */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <Box
                onClick={() => setIsWastageExpanded(!isWastageExpanded)}
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderBottom: isWastageExpanded ? '1px solid' : 'none',
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsIcon color="secondary" /> Section B: Dynamic Wastage Register
                </Typography>
                <Button size="small" sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                  {isWastageExpanded ? 'Collapse' : 'Expand'}
                </Button>
              </Box>
              <Collapse in={isWastageExpanded}>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={3}>
                    {/* Register wastage */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Register Setup Sheets</Typography>
                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>{registerWastage} sheets</Typography>
                      </Box>
                      <Slider
                        value={registerWastage}
                        min={0}
                        max={500}
                        step={10}
                        onChange={(_, v) => setRegisterWastage(v as number)}
                      />
                      <Typography variant="caption" color="text.secondary">Initial proofing waste sheets for plates registration</Typography>
                    </Box>

                    {/* Make ready wastage */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Make Ready Test Sheets</Typography>
                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>{makeReadyWastage} sheets</Typography>
                      </Box>
                      <Slider
                        value={makeReadyWastage}
                        min={0}
                        max={1000}
                        step={25}
                        onChange={(_, v) => setMakeReadyWastage(v as number)}
                      />
                      <Typography variant="caption" color="text.secondary">Wastage for color profile setup on printing press</Typography>
                    </Box>

                    {/* Production wastage % */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Production Margin %</Typography>
                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>{productionWastagePercent}%</Typography>
                      </Box>
                      <Slider
                        value={productionWastagePercent}
                        min={0.0}
                        max={15.0}
                        step={0.5}
                        onChange={(_, v) => setProductionWastagePercent(v as number)}
                      />
                      <Typography variant="caption" color="text.secondary">Continuous production spoilage factor margin</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Collapse>
            </Card>
          </Stack>
        </Grid>

        {/* Right Hand: Recommendation Card & Layout Grid Comparisons */}
        <Grid size={{ xs: 12, lg: 7 }}>
          {calculatedLayouts.length > 0 ? (
            <Stack spacing={3}>
              {/* Highlight best layouts preferenced by user */}
              <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid', borderLeftColor: 'success.main' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                    <Box>
                      <Chip
                        icon={<CheckIcon />}
                        label="AI Heuristics Smart Recommendation"
                        color="success"
                        sx={{ fontWeight: 'bold', mb: 1 }}
                      />
                      <Typography variant="h5" sx={{ fontWeight: 900 }}>
                        {activeLayout?.parentSheetName} → {activeLayout?.machineSheetWidth}×{activeLayout?.machineSheetHeight}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        Optimize By:
                      </Typography>
                      <Tabs
                        value={recommendationPref}
                        onChange={(_, v) => setRecommendationPref(v)}
                        sx={{ minHeight: 28, height: 28, '& .MuiTab-root': { py: 0.5, px: 2, minHeight: 28, height: 28, fontSize: '0.65rem', fontWeight: 'bold' } }}
                      >
                        <Tab value="lowest_waste" label="Lowest Waste" />
                        <Tab value="fastest_machine" label="Fastest Press" />
                        <Tab value="lowest_sheets" label="Least Papers" />
                      </Tabs>
                    </Box>
                  </Box>

                  {/* Recommendation details */}
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, height: '100%' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
                          <AutoIcon color="success" /> Recommendation Analysis
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          "{activeLayout?.recommendationReason}"
                        </Typography>
                        <Divider sx={{ my: 1.5 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">Total Parent Sheets:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                            {activeLayout?.totalParentSheets.toLocaleString()} Sheets
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Total Ups / Packing:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {activeLayout?.ups} Ups ({activeLayout?.layoutType} arrangement)
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      {activeLayout && renderLayoutVisualizer(activeLayout)}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Layout comparisons block */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CompareIcon color="primary" /> Candidate Layout Matrix
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveLayouts}
                    sx={{ borderRadius: '8px', fontWeight: 'bold', textTransform: 'none' }}
                  >
                    Save Layout Settings
                  </Button>
                </Box>
                
                <TableContainer>
                  <Table sx={{ minWidth: 600 }} aria-label="layout comparison matrix">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Parent Sheet</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Machine Sheet</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Ups</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Total Waste %</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Parent Sheets</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Machine Press</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {calculatedLayouts.map((layout) => {
                        const isSelected = layout.id === selectedLayoutId;
                        return (
                          <TableRow
                            key={layout.id}
                            hover
                            onClick={() => setSelectedLayoutId(layout.id)}
                            selected={isSelected}
                            sx={{
                              cursor: 'pointer',
                              '&.Mui-selected': {
                                bgcolor: 'primary.lighter',
                                '&:hover': { bgcolor: 'primary.lighter' }
                              }
                            }}
                          >
                            <TableCell sx={{ fontWeight: 'bold' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {layout.isRecommended && <Chip label="Best" color="success" size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 'bold' }} />}
                                {layout.parentSheetName}
                              </Box>
                            </TableCell>
                            <TableCell>{layout.machineSheetWidth}″ × {layout.machineSheetHeight}″</TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{layout.ups}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{layout.layoutType}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'inline-block', p: 0.5, bgcolor: layout.totalWastePercent < 5 ? 'success.lighter' : layout.totalWastePercent < 15 ? 'warning.lighter' : 'error.lighter', borderRadius: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: layout.totalWastePercent < 5 ? 'success.dark' : layout.totalWastePercent < 15 ? 'warning.dark' : 'error.main' }}>
                                  {layout.totalWastePercent}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              {layout.totalParentSheets.toLocaleString()} sheets
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{layout.machineCode}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{layout.avgSpeed.toLocaleString()} SPH</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                variant={isSelected ? "contained" : "outlined"}
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLayoutId(layout.id);
                                }}
                                sx={{ borderRadius: '6px', py: 0.5, px: 1.5, fontSize: '0.7rem' }}
                              >
                                {isSelected ? "Selected" : "View"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>

              {/* Extra visual indicators detail info */}
              <Box sx={{ p: 2, bgcolor: 'action.disabledBackground', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HelpIcon color="primary" /> Printing Waste vs Cutting Waste Explained
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  - <strong>Cutting Waste</strong> is lost when dividing the raw Parent Sheet (e.g. 23×36) into printing Machine Sheets (e.g. 18×25). Perfect mapping (like 20×30 → 15×20) yields 0% cutting waste!
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  - <strong>Printing Waste</strong> occurs due to machine grippers, left/right margins, tail margins, and blank unutilized spaces where the flat open product doesn't perfectly pack the sheet.
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
              <VisualsIcon sx={{ fontSize: '4rem', color: 'text.secondary', mb: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                Calculation Queue Idle
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 350, mb: 2 }}>
                Please select an Estimate Job from the registry, or adjust open product size dimensions to fire the Paper Intelligence Engine.
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={runIntelligenceEngine}
                sx={{ borderRadius: '8px' }}
              >
                Run Paper Intelligence Engine
              </Button>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
