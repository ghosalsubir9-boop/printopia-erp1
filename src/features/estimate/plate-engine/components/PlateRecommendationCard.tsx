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
  Chip,
  Alert,
  Divider,
  Stack
} from '@mui/material';
import {
  AutoAwesome as SparklesIcon,
  InfoOutlined as DetailIcon,
  ErrorOutlined as WarningIcon,
  CheckCircleOutlined as SuccessIcon
} from '@mui/icons-material';
import { EstimatePlateRecord } from '../types';

interface PlateRecommendationCardProps {
  record: EstimatePlateRecord;
}

export default function PlateRecommendationCard({ record }: PlateRecommendationCardProps) {
  const {
    selectedMethod,
    plateSavingCount,
    plateSavingCost,
    isWorkAndTurnPossible,
    isWorkAndTumblePossible,
    isPerfectingPossible,
    frontColors,
    backColors,
    printingSide,
    machineCode
  } = record;

  // Formulate intelligence recommendation details
  let recommendationTitle = 'AI Plate Optimizer Recommendation';
  let recommendationText = '';
  let adviceSeverity: 'success' | 'info' | 'warning' = 'info';

  if (printingSide === 'Single Side') {
    adviceSeverity = 'info';
    recommendationTitle = 'Single-Sided Job Profile';
    recommendationText = `This is a single-sided job with ${frontColors} front colors on the ${machineCode} press. Standard Sheetwise is the only relevant printing method. No plate savings can be extracted since back-side plates are not required.`;
  } else {
    // Both Side Job
    const savingMethod = record.candidateMethods.find(
      (c) => c.isFeasible && (c.method === 'Work & Turn' || c.method === 'Work & Tumble')
    );

    if (savingMethod) {
      adviceSeverity = 'success';
      recommendationTitle = `Optimal Choice: ${savingMethod.method}`;
      recommendationText = `By choosing ${savingMethod.method} printing on the ${machineCode} press, you combine front and back page layouts onto a single set of ${savingMethod.totalPlates} plates. This halves your plate requirement from ${frontColors + backColors} to just ${savingMethod.totalPlates} plates, delivering a clean material cost reduction of ₹${plateSavingCost.toLocaleString()} (saving ${plateSavingCount} plates). The sheets are run through the press, turned, and run again under the same plates.`;
    } else if (isPerfectingPossible) {
      adviceSeverity = 'info';
      recommendationTitle = 'High-Speed Perfecting Active';
      recommendationText = `No plate savings are possible on plates quantity, but the ${machineCode} press is capable of Perfecting. Both front (${frontColors}) and back (${backColors}) plate cylinders are mounted and run simultaneously, allowing you to print both sides in a single pass of the sheet. This cuts the press runtime and impression counts in half!`;
    } else {
      adviceSeverity = 'warning';
      recommendationTitle = 'Standard Sheetwise Default';
      recommendationText = `Standard Sheetwise is active as no plate-saving methods are currently feasible. To enable Work & Turn / Work & Tumble, please ensure that the layout supports at least 2 Ups (current layout has ${record.ups} Ups), the press supports these methods in its profile, and color counts are compatible.`;
    }
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid', borderColor: adviceSeverity === 'success' ? 'success.main' : adviceSeverity === 'warning' ? 'warning.main' : 'info.main' }}>
      <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SparklesIcon color={adviceSeverity === 'success' ? 'success' : 'info'} /> {recommendationTitle}
        </Typography>
        {plateSavingCount > 0 && (
          <Chip
            label="Save 50% Plates"
            color="success"
            size="small"
            sx={{ fontWeight: 'black', fontSize: '0.65rem', height: 18 }}
          />
        )}
      </Box>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            {recommendationText}
          </Typography>

          <Divider />

          {/* Quick Stats Grid */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block' }}>
                FRONT COLORS
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>
                {frontColors} Colors
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block' }}>
                BACK COLORS
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>
                {backColors} Colors
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block' }}>
                W&T FEASIBILITY
              </Typography>
              <Chip
                label={isWorkAndTurnPossible ? 'Available' : 'Unavailable'}
                color={isWorkAndTurnPossible ? 'success' : 'default'}
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.62rem', fontWeight: 'bold', mt: 0.5 }}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block' }}>
                W&TUMBLE FEASIBILITY
              </Typography>
              <Chip
                label={isWorkAndTumblePossible ? 'Available' : 'Unavailable'}
                color={isWorkAndTumblePossible ? 'success' : 'default'}
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.62rem', fontWeight: 'bold', mt: 0.5 }}
              />
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
