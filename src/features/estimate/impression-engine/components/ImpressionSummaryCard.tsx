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
  Stack,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Schedule as TimeIcon,
  SettingsBackupRestore as WastageIcon,
  Layers as ImpressionsIcon,
  FactCheck as ResultIcon
} from '@mui/icons-material';
import { EstimateImpressionRecord } from '../types';

interface ImpressionSummaryCardProps {
  record: EstimateImpressionRecord;
}

export default function ImpressionSummaryCard({ record }: ImpressionSummaryCardProps) {
  const {
    runningSheets,
    registerSheets,
    makeReadySheets,
    productionWastage,
    totalMachineSheets,
    totalParentSheets,
    frontImpressions,
    backImpressions,
    grandTotalImpressions,
    avgSpeed,
    runningTimeHours,
    runningTimeMinutes,
    printingMethod,
    machineName,
    machineSheetsPerParent
  } = record;

  const totalWastageSheets = registerSheets + makeReadySheets + productionWastage;
  const wastageRatio = totalMachineSheets > 0 ? (totalWastageSheets / totalMachineSheets) * 100 : 0;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid', borderColor: 'secondary.main', height: '100%' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ImpressionsIcon color="secondary" /> Machine Impression Summary
        </Typography>
        <Chip
          label={`${printingMethod} Runs`}
          color="secondary"
          variant="filled"
          size="small"
          sx={{ fontWeight: 'bold' }}
        />
      </Box>
      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Total Press Impressions */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: 2, bgcolor: 'secondary.lighter', color: 'secondary.dark', borderRadius: 2, border: '1px solid', borderColor: 'secondary.light', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 'black', textTransform: 'uppercase', color: 'secondary.dark' }}>
                Grand Total Press Impressions
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, my: 1 }}>
                {grandTotalImpressions.toLocaleString()}
              </Typography>
              <Stack direction="row" spacing={1.5} divider={<Divider orientation="vertical" flexItem />}>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  Front: {frontImpressions.toLocaleString()}
                </Typography>
                {backImpressions > 0 && (
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    Back: {backImpressions.toLocaleString()}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Grid>

          {/* Machine Running Time */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TimeIcon sx={{ fontSize: '1rem' }} /> Press Runtime Estimate
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, my: 1, color: 'text.primary' }}>
                {runningTimeHours} Hrs {runningTimeMinutes} Mins
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Computed at {avgSpeed.toLocaleString()} Sheets/Hr on {machineName}
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 0.5 }} />
          </Grid>

          {/* Detailed sheet breakdown */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                Running Sheets (Net)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
                {runningSheets.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Net print copies
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                Wastage (Reg + MR + Prod)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: 'error.main' }}>
                +{totalWastageSheets.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Setup & press run waste
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                Gross Feed Sheets (Machine)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
                {totalMachineSheets.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Yields {totalParentSheets.toLocaleString()} Parent Sheets
              </Typography>
            </Box>
          </Grid>

          {/* Wastage Progress Bar */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  Wastage Allowance Ratio
                </Typography>
                <Typography variant="caption" color="error.main" sx={{ fontWeight: 'bold' }}>
                  {wastageRatio.toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, wastageRatio * 4)} // Scale up for visibility
                color={wastageRatio > 10 ? 'error' : 'warning'}
                sx={{ height: 6, borderRadius: 2 }}
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
