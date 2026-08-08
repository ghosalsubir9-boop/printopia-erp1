/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card, CardContent, Box, Typography, Alert, AlertTitle, Stack, Divider, Button } from '@mui/material';
import {
  TrendingUp as SavingsIcon,
  TipsAndUpdatesOutlined as RecommendationIcon,
  CheckCircleRounded as SelectedIcon
} from '@mui/icons-material';
import { MachineComparisonItem } from '../types';

interface RecommendationCardProps {
  comparisons: MachineComparisonItem[];
  selectedMachineId: string;
  onApplyBestMachine: (machineId: string) => void;
}

export default function RecommendationCard({
  comparisons,
  selectedMachineId,
  onApplyBestMachine
}: RecommendationCardProps) {
  if (comparisons.length === 0) return null;

  const bestMachine = comparisons.find((c) => c.isBest);
  const selectedMachine = comparisons.find((c) => c.machineId === selectedMachineId) || comparisons[0];

  if (!bestMachine) return null;

  const savings = Math.max(0, selectedMachine.totalCost - bestMachine.totalCost);
  const isBestSelected = selectedMachine.machineId === bestMachine.machineId;

  return (
    <Card variant="outlined" id="recommendation-card" sx={{ borderRadius: 3, height: '100%' }}>
      <Box sx={{ p: 2, bgcolor: 'secondary.lighter', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <RecommendationIcon color="secondary" />
        <Typography variant="subtitle2" sx={{ fontWeight: 'black', textTransform: 'uppercase', color: 'secondary.dark' }}>
          Smart Cost Recommendation Panel
        </Typography>
      </Box>

      <CardContent sx={{ p: 3 }}>
        {isBestSelected ? (
          <Alert severity="success" icon={<SelectedIcon sx={{ color: 'success.main' }} />} sx={{ borderRadius: 2, mb: 3 }}>
            <AlertTitle sx={{ fontWeight: 'bold' }}>Most Cost-Efficient Press Selected!</AlertTitle>
            You are currently using <strong>{bestMachine.machineName}</strong>, which is the most economical machine for this setup. No further optimization needed!
          </Alert>
        ) : (
          <Alert severity="warning" icon={<SavingsIcon sx={{ color: 'warning.dark' }} />} sx={{ borderRadius: 2, mb: 3 }}>
            <AlertTitle sx={{ fontWeight: 'bold' }}>Cost Saving Opportunity Available</AlertTitle>
            Switching to <strong>{bestMachine.machineName}</strong> could save you roughly{' '}
            <strong>Rs. {Math.round(savings).toLocaleString()}</strong> in printing costs!
          </Alert>
        )}

        <Stack spacing={2}>
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
              Recommended Machine
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>
              {bestMachine.machineName} ({bestMachine.machineCode})
            </Typography>
            
            <Box sx={{ mt: 1.5, display: 'flex', gap: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Simulated Cost</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                  Rs. {Math.round(bestMachine.totalCost).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Plate Setup Cost</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Rs. {Math.round(bestMachine.plateCost).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Running Cost</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Rs. {Math.round(bestMachine.printingCost).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </Box>

          {!isBestSelected && (
            <Button
              variant="contained"
              color="success"
              fullWidth
              startIcon={<SelectedIcon />}
              onClick={() => onApplyBestMachine(bestMachine.machineId)}
              sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2, py: 1 }}
            >
              Apply Recommended Press (Save Rs. {Math.round(savings).toLocaleString()})
            </Button>
          )}

          <Divider sx={{ my: 1 }} />

          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 1 }}>
            * Note: Simulated estimations are derived dynamically by factoring in setup wastage, speed capabilities, plate specifications, and print charge structures configured under Machine Master.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
