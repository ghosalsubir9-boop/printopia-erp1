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
  Tooltip,
  Divider,
  Stack,
  TextField
} from '@mui/material';
import {
  Layers as PlatesIcon,
  AttachMoney as CurrencyIcon,
  AutoAwesome as SavingIcon,
  InfoOutlined as InfoIcon,
  TrendingDown as ReductionIcon
} from '@mui/icons-material';
import { EstimatePlateRecord } from '../types';

interface PlateSummaryCardProps {
  record: EstimatePlateRecord;
  manualPlateQty?: string;
  onManualPlateQtyChange?: (val: string) => void;
}

export default function PlateSummaryCard({
  record,
  manualPlateQty,
  onManualPlateQtyChange
}: PlateSummaryCardProps) {
  const {
    selectedMethod,
    frontPlateCount,
    backPlateCount,
    totalPlateCount,
    totalPlateCost,
    plateSavingCount,
    plateSavingCost,
    plateCostPerPlate,
    machineName
  } = record;

  const hasSavings = plateSavingCount > 0;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid', borderColor: 'primary.main', height: '100%' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlatesIcon color="primary" /> Plate Calculation Summary
        </Typography>
        <Chip
          label={selectedMethod}
          color="primary"
          variant="filled"
          size="small"
          sx={{ fontWeight: 'bold' }}
        />
      </Box>
      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Plates Count Column */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Stack spacing={1} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                Total Plate Quantity
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main', my: 0.5 }}>
                {totalPlateCount}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5 }}>
                <Chip
                  label={`F: ${frontPlateCount}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 'bold', fontSize: '0.65rem', height: 18 }}
                />
                {record.printingSide === 'Both Side' && (
                  <Chip
                    label={`B: ${backPlateCount}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 'bold', fontSize: '0.65rem', height: 18 }}
                  />
                )}
              </Box>
            </Stack>
          </Grid>

          {/* Plate Cost Column */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Stack spacing={1} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                Plate Costing (Rs.)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, my: 1, color: 'text.primary' }}>
                ₹{totalPlateCost.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ₹{plateCostPerPlate} / plate on {machineName}
              </Typography>
            </Stack>
          </Grid>

          {/* Plates Saving Column */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Stack
              spacing={1}
              sx={{
                p: 1.5,
                bgcolor: hasSavings ? 'success.lighter' : 'action.disabledBackground',
                color: hasSavings ? 'success.dark' : 'text.secondary',
                borderRadius: 2,
                textAlign: 'center',
                border: '1px solid',
                borderColor: hasSavings ? 'success.light' : 'divider',
                height: '100%',
                justifyContent: 'center'
              }}
            >
              {hasSavings ? (
                <>
                  <Typography variant="caption" sx={{ fontWeight: 'black', textTransform: 'uppercase', color: 'success.dark', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <SavingIcon fontSize="inherit" /> Plate Savings Active
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: 'success.dark' }}>
                    ₹{plateSavingCost.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    Saved {plateSavingCount} Plates (50%)
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Layout Plate Savings
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.disabled', my: 1 }}>
                    None
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {record.printingSide === 'Single Side' ? 'Single Side Job' : 'No plate reduction available'}
                  </Typography>
                </>
              )}
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2.5 }} />

        <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 3, border: '1px solid', borderColor: 'primary.light' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.dark', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            🔧 Operator Plate Quantity Override Flow
          </Typography>
          
          <Grid container spacing={3} sx={{ alignItems: 'center', justifyContent: 'center' }}>
            {/* System Calculated Qty */}
            <Grid size={{ xs: 12, md: 3 }} sx={{ textAlign: 'center' }}>
              <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>
                  System Calculated Qty
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.secondary', mt: 0.5 }}>
                  {record.systemPlateCount} plates
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  based on {record.selectedMethod}
                </Typography>
              </Box>
            </Grid>

            {/* Down Arrow or Flow Indicator */}
            <Grid size={{ xs: 12, md: 1 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
                ↓
              </Typography>
            </Grid>

            {/* Editable Final Plate Qty */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: 'center' }}>
              <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'primary.light' }}>
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'extrabold', display: 'block', textTransform: 'uppercase', mb: 1 }}>
                  Editable Final Plate Qty *
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Final Plate Count"
                  value={manualPlateQty !== undefined ? manualPlateQty : (record.manualPlateQty !== undefined ? record.manualPlateQty : '')}
                  onChange={(e) => onManualPlateQtyChange && onManualPlateQtyChange(e.target.value)}
                  placeholder={String(record.systemPlateCount)}
                  helperText="Clear to use system calculated plates"
                  slotProps={{
                    htmlInput: { min: 0, step: '1' }
                  }}
                  sx={{
                    '& .MuiInputBase-input': { fontWeight: 'bold', textAlign: 'center' }
                  }}
                />
              </Box>
            </Grid>

            {/* Equal or Arrow Indicator */}
            <Grid size={{ xs: 12, md: 1 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
                =
              </Typography>
            </Grid>

            {/* Final Plate Cost */}
            <Grid size={{ xs: 12, md: 3 }} sx={{ textAlign: 'center' }}>
              <Box sx={{ p: 1.5, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', textTransform: 'uppercase', opacity: 0.9 }}>
                  Final Plate Cost
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>
                  ₹{record.totalPlateCost.toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                  {record.totalPlateCount} plates × ₹{record.plateCostPerPlate}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}
