/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Typography,
  Box,
  Tooltip
} from '@mui/material';
import {
  CheckCircle as FeasibleIcon,
  Cancel as InfeasibleIcon,
  InfoOutlined as InfoIcon,
  AutoAwesome as BestBadgeIcon
} from '@mui/icons-material';
import { PlateMethodResult } from '../types';
import { PrintingMethod } from '../../../machines/types';

interface PlateComparisonTableProps {
  candidates: PlateMethodResult[];
  selectedMethod: PrintingMethod;
  onSelectMethod: (method: PrintingMethod) => void;
}

export default function PlateComparisonTable({
  candidates,
  selectedMethod,
  onSelectMethod
}: PlateComparisonTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Table sx={{ minWidth: 650 }} aria-label="printing plate comparison candidate matrix">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Printing Method</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Feasibility Status</TableCell>
            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Front / Back Plates</TableCell>
            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Total Plates</TableCell>
            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Total Plate Cost</TableCell>
            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Plate Savings</TableCell>
            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Total Run Impressions</TableCell>
            <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {candidates.map((cand) => {
            const isSelected = cand.method === selectedMethod;
            const isSavingMethod = cand.plateSavingCount > 0;

            return (
              <TableRow
                key={cand.method}
                selected={isSelected}
                hover
                sx={{
                  '&.Mui-selected': {
                    bgcolor: 'primary.lighter',
                    '&:hover': { bgcolor: 'primary.lighter' }
                  }
                }}
              >
                {/* Method & Description */}
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {cand.method}
                      {isSavingMethod && cand.isFeasible && (
                        <Tooltip title="Plate Saving Advantage Active">
                          <BestBadgeIcon color="success" sx={{ fontSize: '1rem' }} />
                        </Tooltip>
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 220, fontSize: '0.7rem', lineHeight: 1.2, mt: 0.5 }}>
                      {cand.description}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Feasibility Status */}
                <TableCell>
                  {cand.isFeasible ? (
                    <Chip
                      icon={<FeasibleIcon color="success" />}
                      label="Feasible"
                      color="success"
                      variant="outlined"
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                  ) : (
                    <Tooltip title={cand.feasibilityReason}>
                      <Chip
                        icon={<InfeasibleIcon color="error" />}
                        label="Infeasible"
                        color="error"
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 'bold', cursor: 'help' }}
                      />
                    </Tooltip>
                  )}
                  {!cand.isFeasible && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', fontSize: '0.65rem', mt: 0.5, maxWidth: 150, lineHeight: 1.2 }}>
                      {cand.feasibilityReason}
                    </Typography>
                  )}
                </TableCell>

                {/* Plates split */}
                <TableCell align="center">
                  {cand.isFeasible ? (
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {cand.frontPlates} Front / {cand.backPlates} Back
                    </Typography>
                  ) : (
                    <Typography color="text.disabled">—</Typography>
                  )}
                </TableCell>

                {/* Total Plates */}
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {cand.isFeasible ? cand.totalPlates : <Typography color="text.disabled">—</Typography>}
                </TableCell>

                {/* Total Cost */}
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {cand.isFeasible ? `₹${cand.plateCost.toLocaleString()}` : <Typography color="text.disabled">—</Typography>}
                </TableCell>

                {/* Plate Savings */}
                <TableCell align="center">
                  {cand.isFeasible && cand.plateSavingCount > 0 ? (
                    <Chip
                      label={`Saved ₹${cand.plateSavingCost.toLocaleString()} (${cand.plateSavingCount} pl)`}
                      size="small"
                      color="success"
                      sx={{ fontWeight: 'black', fontSize: '0.68rem' }}
                    />
                  ) : cand.isFeasible ? (
                    <Typography variant="caption" color="text.secondary">—</Typography>
                  ) : (
                    <Typography color="text.disabled">—</Typography>
                  )}
                </TableCell>

                {/* Total Impressions */}
                <TableCell align="center">
                  {cand.isFeasible ? (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {cand.totalImpressions.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        ({cand.netMachineSheets.toLocaleString()} sheets × {cand.impressionMultiplier} runs)
                      </Typography>
                    </Box>
                  ) : (
                    <Typography color="text.disabled">—</Typography>
                  )}
                </TableCell>

                {/* Select Method Button */}
                <TableCell align="right">
                  <Button
                    size="small"
                    variant={isSelected ? 'contained' : 'outlined'}
                    color="primary"
                    disabled={!cand.isFeasible}
                    onClick={() => onSelectMethod(cand.method)}
                    sx={{ textTransform: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.72rem' }}
                  >
                    {isSelected ? 'Selected' : 'Use Method'}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
