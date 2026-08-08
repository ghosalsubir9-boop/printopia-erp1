/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card, CardContent, Box, Typography, Divider, Stack, Tooltip, Grid } from '@mui/material';
import {
  PieChartOutlined as ChartIcon,
  LayersOutlined as PlateIcon,
  PrintOutlined as RunIcon,
  PaymentsOutlined as MoneyIcon,
  ArticleOutlined as SheetIcon,
  ExtensionOutlined as PieceIcon,
  WatchLaterOutlined as TimeIcon
} from '@mui/icons-material';

interface CostBreakdownCardProps {
  plateCost: number;
  printingCost: number;
  totalPrintingCost: number;
  costPerSheet: number;
  costPerPiece: number; // synonymous with Cost Per Impression
  runningTimeHours: number;
  runningTimeMinutes: number;
}

export default function CostBreakdownCard({
  plateCost,
  printingCost,
  totalPrintingCost,
  costPerSheet,
  costPerPiece,
  runningTimeHours,
  runningTimeMinutes
}: CostBreakdownCardProps) {
  const platePercent = totalPrintingCost > 0 ? (plateCost / totalPrintingCost) * 100 : 0;
  const printingPercent = totalPrintingCost > 0 ? (printingCost / totalPrintingCost) * 100 : 0;

  return (
    <Card variant="outlined" id="cost-breakdown-card" sx={{ borderRadius: 3, height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
      <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <ChartIcon color="primary" />
        <Typography variant="subtitle2" sx={{ fontWeight: 'black', textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.75rem', tracking: 0.5 }}>
          Cost Breakdown Panel
        </Typography>
      </Box>

      <CardContent sx={{ p: 3 }}>
        {/* Beautiful Custom Visual Bar Stack */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', height: 16, borderRadius: 1.5, overflow: 'hidden', mb: 1, border: '1px solid', borderColor: 'divider' }}>
            <Tooltip title={`Plates cost Rs. ${plateCost.toLocaleString()} (${platePercent.toFixed(1)}%)`} arrow>
              <Box sx={{ width: `${platePercent}%`, bgcolor: 'secondary.main', transition: 'all 0.5s ease', cursor: 'help' }} />
            </Tooltip>
            <Tooltip title={`Printing / Run cost Rs. ${printingCost.toLocaleString()} (${printingPercent.toFixed(1)}%)`} arrow>
              <Box sx={{ width: `${printingPercent}%`, bgcolor: 'success.main', transition: 'all 0.5s ease', cursor: 'help' }} />
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Plates ({platePercent.toFixed(0)}%)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Printing ({printingPercent.toFixed(0)}%)
            </Typography>
          </Box>
        </Box>

        {/* Breakdown Items List */}
        <Stack spacing={1.5}>
          {/* Plate Cost */}
          <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PlateIcon sx={{ color: 'secondary.main', fontSize: '1.25rem' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                  Plate Cost
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Setup fee for offset plates
                </Typography>
              </Box>
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 800, color: 'text.primary' }}>
              ₹{Math.round(plateCost).toLocaleString()}
            </Typography>
          </Box>

          {/* Printing Cost */}
          <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <RunIcon sx={{ color: 'success.main', fontSize: '1.25rem' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                  Printing Cost
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Variable running impression costs
                </Typography>
              </Box>
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 800, color: 'text.primary' }}>
              ₹{Math.round(printingCost).toLocaleString()}
            </Typography>
          </Box>

          {/* Total Printing Cost */}
          <Box sx={{ p: 1.5, border: '1.5px solid', borderColor: 'primary.light', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.lighter' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <MoneyIcon sx={{ color: 'primary.main', fontSize: '1.25rem' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 900, color: 'primary.dark' }}>
                  Total Printing Cost
                </Typography>
                <Typography variant="caption" color="primary.dark" sx={{ fontSize: '0.7rem' }}>
                  Plate Cost + Printing Cost
                </Typography>
              </Box>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.darker' }}>
              ₹{Math.round(totalPrintingCost).toLocaleString()}
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Cost Per Sheet & Cost Per Piece Grid */}
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover', textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                  <SheetIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    Cost Per Sheet
                  </Typography>
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  ₹{costPerSheet.toFixed(2)}
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover', textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                  <PieceIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    Cost Per Piece
                  </Typography>
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  ₹{costPerPiece.toFixed(2)}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Machine Running Time */}
          <Box sx={{ p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TimeIcon sx={{ color: 'text.secondary', fontSize: '1.25rem' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                  Machine Running Time
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Estimated duration of the press run
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
              {runningTimeHours} Hr {runningTimeMinutes} Min
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

