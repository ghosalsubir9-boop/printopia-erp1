/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Grid,
  Chip,
  Divider,
  Stack,
  Alert,
  Tooltip
} from '@mui/material';
import {
  CompareArrows as ConversionIcon,
  Layers as LayersIcon,
  TrendingUp as IncreaseIcon,
  CheckCircleOutlined as OKIcon,
  QueryStats as StatsIcon,
  Timeline as FlowIcon,
  WatchLater as TimeIcon
} from '@mui/icons-material';
import { EstimateImpressionRecord } from '../types';

interface ImpressionAnalysisPanelProps {
  record: EstimateImpressionRecord;
}

export default function ImpressionAnalysisPanel({ record }: ImpressionAnalysisPanelProps) {
  const {
    parentSheetName,
    parentWidth,
    parentHeight,
    machineSheetSize,
    machineSheetWidth,
    machineSheetHeight,
    machineSheetsPerParent,
    totalParentSheets,
    totalMachineSheets,
    frontImpressions,
    backImpressions,
    grandTotalImpressions,
    runningTimeHours,
    runningTimeMinutes,
    printingSide,
    printingMethod,
    quantity
  } = record;

  const isMultipleSheets = machineSheetsPerParent > 1;

  // Formatting dimensions for display
  const pWidth = parentWidth || 25;
  const pHeight = parentHeight || 36;
  const mWidth = machineSheetWidth || 18;
  const mHeight = machineSheetHeight || 25;

  const parentSizeLabel = `${pWidth}″ × ${pHeight}″`;
  const machineSizeLabel = `${mWidth}″ × ${mHeight}″`;

  return (
    <Card variant="outlined" id="impression-analysis-panel" sx={{ borderRadius: 3, border: '1px solid', borderColor: 'primary.light', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <Box sx={{ p: 2.5, bgcolor: 'primary.lighter', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1, color: 'primary.dark' }}>
          <StatsIcon sx={{ fontSize: '1.25rem' }} /> ERP Impression & Sheet Conversion Analysis
        </Typography>
        <Chip
          label={`Ratio 1 : ${machineSheetsPerParent}`}
          color={isMultipleSheets ? 'warning' : 'success'}
          size="small"
          sx={{ fontWeight: 'black', fontSize: '0.7rem' }}
        />
      </Box>

      <CardContent sx={{ p: 3 }}>
        {/* Core KPIs Row */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center', bgcolor: 'background.paper' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>Parent Sheets</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>{totalParentSheets.toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>{parentSheetName}</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center', bgcolor: 'background.paper' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>Machine Sheets</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: isMultipleSheets ? 'warning.dark' : 'text.primary' }}>{totalMachineSheets.toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>{machineSheetSize}</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center', bgcolor: 'background.paper' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>Total Impressions</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: 'secondary.main' }}>{grandTotalImpressions.toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                F: {frontImpressions.toLocaleString()} | B: {backImpressions.toLocaleString()}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center', bgcolor: 'background.paper' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>Press Running Time</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <TimeIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /> {runningTimeHours}h {runningTimeMinutes}m
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>Speed: {record.avgSpeed.toLocaleString()} SPH</Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Dynamic Warning Alert on Sheet Slitting & Impression Doubling */}
        {isMultipleSheets ? (
          <Alert
            severity="warning"
            icon={<IncreaseIcon sx={{ color: 'warning.dark' }} />}
            sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'warning.light' }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'warning.dark' }}>
              Impression Volatility Multiplier Active (Rule 1 & 2)
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', lineHeight: 1.4 }}>
              Because the parent sheet ({parentSheetName}) is divided into <strong>{machineSheetsPerParent} machine sheets</strong> ({machineSheetSize}), the press feed quantity has scaled up from {totalParentSheets.toLocaleString()} to <strong>{totalMachineSheets.toLocaleString()}</strong>.
              Consequently, the total impressions processed by the cylinder press are computed on the <strong>Machine Sheet volume</strong>, doubling/multiplying the overall press stroke count.
            </Typography>
          </Alert>
        ) : (
          <Alert
            severity="success"
            icon={<OKIcon sx={{ color: 'success.dark' }} />}
            sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'success.light' }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
              1:1 Sheet Alignment Verified
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', lineHeight: 1.4 }}>
              Parent sheet size maps 1:1 with the machine sheet size. The press is fed directly with no slitting or intermediate conversion needed. Impressions count strictly matches the machine sheets count.
            </Typography>
          </Alert>
        )}

        <Divider sx={{ mb: 3 }} />

        {/* Core Visualization Flow Diagram */}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'black', textTransform: 'uppercase', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FlowIcon /> Conversion Flow & Impression Mapping
        </Typography>

        <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover', border: '1px dashed', borderColor: 'divider' }}>
          <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
            
            {/* Step 1: Parent Sheet Node */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase' }}>
                  Parent Stock
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 900, my: 0.5, color: 'text.primary' }}>
                  {parentSizeLabel}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {totalParentSheets.toLocaleString()} <span style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>sheets</span>
                </Typography>
              </Box>
            </Grid>

            {/* Step 2: Conversion Operator */}
            <Grid size={{ xs: 12, md: 1 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <ConversionIcon color={isMultipleSheets ? 'warning' : 'disabled'} sx={{ fontSize: '1.5rem', transform: { xs: 'rotate(90deg)', md: 'none' } }} />
                <Typography variant="caption" sx={{ fontWeight: 'black', color: isMultipleSheets ? 'warning.dark' : 'text.secondary', fontSize: '0.65rem', mt: 0.5 }}>
                  {isMultipleSheets ? `Slit ×${machineSheetsPerParent}` : 'Direct'}
                </Typography>
              </Box>
            </Grid>

            {/* Step 3: Machine Sheet Node */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', border: isMultipleSheets ? '1px solid' : '1px solid', borderColor: isMultipleSheets ? 'warning.light' : 'divider', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative' }}>
                {isMultipleSheets && (
                  <Chip
                    label="Volume Scaled"
                    color="warning"
                    size="small"
                    sx={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', height: 16, fontSize: '0.55rem', fontWeight: 'bold' }}
                  />
                )}
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase' }}>
                  Press Sheets
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 900, my: 0.5, color: 'text.primary' }}>
                  {machineSizeLabel}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: isMultipleSheets ? 'warning.dark' : 'text.primary' }}>
                  {totalMachineSheets.toLocaleString()} <span style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>sheets</span>
                </Typography>
              </Box>
            </Grid>

            {/* Step 4: Press Operator */}
            <Grid size={{ xs: 12, md: 1 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <ConversionIcon color="secondary" sx={{ fontSize: '1.5rem', transform: { xs: 'rotate(90deg)', md: 'none' } }} />
                <Typography variant="caption" sx={{ fontWeight: 'black', color: 'secondary.main', fontSize: '0.65rem', mt: 0.5 }}>
                  {printingSide === 'Both Side' && printingMethod !== 'Perfecting' ? 'Pass ×2' : 'Pass ×1'}
                </Typography>
              </Box>
            </Grid>

            {/* Step 5: Impressions Node */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'secondary.lighter', border: '1px solid', borderColor: 'secondary.light', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 'black', color: 'secondary.dark', textTransform: 'uppercase' }}>
                  Total Impressions
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'secondary.dark', my: 0.5 }}>
                  {grandTotalImpressions.toLocaleString()}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
                  <Chip label={`Front: ${frontImpressions.toLocaleString()}`} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 'bold', borderColor: 'secondary.light' }} />
                  {backImpressions > 0 && (
                    <Chip label={`Back: ${backImpressions.toLocaleString()}`} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 'bold', borderColor: 'secondary.light' }} />
                  )}
                </Stack>
              </Box>
            </Grid>

          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}
