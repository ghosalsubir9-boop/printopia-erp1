/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card, CardContent, Grid, Box, Typography, Divider, Avatar } from '@mui/material';
import {
  PaymentsOutlined as MoneyIcon,
  LayersOutlined as PlateIcon,
  PrintOutlined as PrintingIcon,
  SpeedOutlined as RunningIcon
} from '@mui/icons-material';

interface PrintingCostSummaryCardProps {
  plateCost: number;
  printingCost: number;
  runningCost: number;
  totalPrintingCost: number;
  costPerImpression: number;
  costPerSheet: number;
  plateCount: number;
  totalImpressions: number;
  machineName: string;
}

export default function PrintingCostSummaryCard({
  plateCost,
  printingCost,
  runningCost,
  totalPrintingCost,
  costPerImpression,
  costPerSheet,
  plateCount,
  totalImpressions,
  machineName
}: PrintingCostSummaryCardProps) {
  return (
    <Card variant="outlined" id="printing-cost-summary-card" sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
      <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon /> Active Cost Summary: {machineName}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
          Imps: {totalImpressions.toLocaleString()} | Plates: {plateCount}
        </Typography>
      </Box>

      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Total Printing Cost KPI */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'primary.light', borderRadius: 3, bgcolor: 'primary.lighter', height: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                <MoneyIcon />
              </Avatar>
              <Box>
                <Typography variant="caption" color="primary.dark" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Total Printing Cost
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.darker' }}>
                  Rs. {Math.round(totalPrintingCost).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Plate + Run Cost combined
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Plate Cost */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', height: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.dark', width: 44, height: 44 }}>
                <PlateIcon />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  Total Plate Cost
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Rs. {Math.round(plateCost).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {plateCount} Plates configured
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Running/Printing Cost */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', height: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'success.lighter', color: 'success.dark', width: 44, height: 44 }}>
                <PrintingIcon />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  Run/Printing Cost
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Rs. {Math.round(printingCost).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Based on impressions speed
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Dynamic unit cost metrics */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4 }}>
            <Box sx={{ p: 1.5, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                Cost Per Impression
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>
                Rs. {costPerImpression.toFixed(2)}
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 6, sm: 4 }}>
            <Box sx={{ p: 1.5, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                Cost Per Sheet
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>
                Rs. {costPerSheet.toFixed(2)}
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ p: 1.5, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                Running Cost (Press Time)
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5, color: 'success.dark' }}>
                Rs. {Math.round(runningCost).toLocaleString()}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
