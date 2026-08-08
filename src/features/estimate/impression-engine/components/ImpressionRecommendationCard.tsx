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
  Divider,
  Stack
} from '@mui/material';
import {
  AutoAwesome as SparklesIcon,
  HelpOutlineOutlined as AdviceIcon,
  CompareArrows as SwitchIcon
} from '@mui/icons-material';
import { EstimateImpressionRecord } from '../types';

interface ImpressionRecommendationCardProps {
  record: EstimateImpressionRecord;
}

export default function ImpressionRecommendationCard({ record }: ImpressionRecommendationCardProps) {
  const {
    machineSheetsPerParent,
    parentSheetName,
    machineSheetSize,
    totalMachineSheets,
    totalParentSheets,
    printingSide,
    printingMethod,
    registerSheets,
    makeReadySheets,
    productionWastage,
    quantity
  } = record;

  const isMultipleSheets = machineSheetsPerParent > 1;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid', borderColor: 'primary.main' }}>
      <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SparklesIcon color="primary" /> Conversion & Sheet Rule Analytics
        </Typography>
        {isMultipleSheets && (
          <Chip
            label={`${machineSheetsPerParent} Out Sheet Cut`}
            color="success"
            size="small"
            sx={{ fontWeight: 'black', fontSize: '0.65rem', height: 18 }}
          />
        )}
      </Box>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          {/* Sheet Conversion Rule Callout */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <SwitchIcon color="primary" sx={{ mt: 0.5 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {isMultipleSheets
                  ? `Parent Sheet Conversion: ${machineSheetsPerParent} Machine Sheets per Parent`
                  : '1:1 Parent to Machine Sheet Mapping'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
                {isMultipleSheets
                  ? `Rule 1 & 2 Enforced: 1 Parent Sheet (${parentSheetName}) is slit into ${machineSheetsPerParent} Machine Sheets (${machineSheetSize}). Thus, ${totalParentSheets.toLocaleString()} Parent Sheets yield ${totalMachineSheets.toLocaleString()} total Machine Sheets. Actual impressions are computed on the Machine Sheet feed quantity on press.`
                  : `Standard Sheet Feeding: 1 Parent Sheet maps directly to 1 Machine Sheet (${machineSheetSize}). No sheet slitting is required prior to press run.`}
              </Typography>
            </Box>
          </Box>

          <Divider />

          {/* Setup Wastage Callout */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <AdviceIcon color="info" sx={{ mt: 0.5 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                Setup & Registration Tolerances
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
                This run includes <strong>{registerSheets} Register Sheets</strong> and <strong>{makeReadySheets} Make Ready Sheets</strong> for plate alignment on press. A production wastage allowance of <strong>{productionWastage} sheets</strong> handles running spoilage. These are loaded directly from your Machine Master to prevent under-runs on the final {quantity.toLocaleString()} delivery.
              </Typography>
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
