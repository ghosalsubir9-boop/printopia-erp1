/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  CheckCircle as BestIcon,
  HelpOutlined as InfoIcon,
  PlayArrow as SelectIcon,
  GridViewOutlined as CardsIcon,
  TableChartOutlined as TableIcon
} from '@mui/icons-material';
import { MachineComparisonItem } from '../types';

interface MachineComparisonTableProps {
  comparisons: MachineComparisonItem[];
  selectedMachineId: string;
  onSelectMachine: (machineId: string) => void;
}

export default function MachineComparisonTable({
  comparisons,
  selectedMachineId,
  onSelectMachine
}: MachineComparisonTableProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const handleViewChange = (
    _event: React.MouseEvent<HTMLElement>,
    nextView: 'cards' | 'table' | null
  ) => {
    if (nextView !== null) {
      setViewMode(nextView);
    }
  };

  // Helper to format hours in decimal form, e.g., 1.8 Hour
  const formatDecimalHours = (hours: number, minutes: number) => {
    const decimal = hours + minutes / 60;
    return `${decimal.toFixed(1)} Hour`;
  };

  return (
    <Box id="machine-comparison-panel" sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'text.primary' }}>
            Machine Cost Comparison Simulator
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Simulated results for {comparisons.length} presses. Select any option to manually override.
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewChange}
          size="small"
          aria-label="view mode"
          color="primary"
        >
          <ToggleButton value="cards" aria-label="cards layout" sx={{ px: 1.5, py: 0.5 }}>
            <CardsIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
            Cards
          </ToggleButton>
          <ToggleButton value="table" aria-label="table layout" sx={{ px: 1.5, py: 0.5 }}>
            <TableIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
            Table
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewMode === 'cards' ? (
        /* GORGEOUS CARD VIEW - ALIGNED WITH USER MOCKUP EXAMPLE */
        <Grid container spacing={2}>
          {comparisons.map((row) => {
            const isCurrentlySelected = row.machineId === selectedMachineId;
            const decimalTime = formatDecimalHours(row.runningTimeHours, row.runningTimeMinutes);

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={row.machineId}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100%',
                    transition: 'all 0.2s ease',
                    border: isCurrentlySelected
                      ? '2px solid'
                      : row.isBest
                      ? '1.5px solid'
                      : '1px solid',
                    borderColor: isCurrentlySelected
                      ? 'primary.main'
                      : row.isBest
                      ? 'success.light'
                      : 'divider',
                    boxShadow: isCurrentlySelected
                      ? '0 4px 16px rgba(25, 118, 210, 0.08)'
                      : row.isBest
                      ? '0 4px 16px rgba(46, 125, 50, 0.05)'
                      : 'none',
                    '&:hover': {
                      borderColor: isCurrentlySelected
                        ? 'primary.main'
                        : 'primary.light',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.06)'
                    }
                  }}
                >
                  <CardActionArea 
                    onClick={() => onSelectMachine(row.machineId)}
                    sx={{ height: '100%', p: 2.5 }}
                  >
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary', lineHeight: 1.2 }}>
                          {row.machineName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                          {row.machineCode}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                        {row.isBest && (
                          <Chip
                            icon={<BestIcon sx={{ color: 'success.main', fontSize: '0.9rem' }} />}
                            label="Best Option"
                            size="small"
                            color="success"
                            sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }}
                          />
                        )}
                        {isCurrentlySelected && (
                          <Chip
                            label="Active"
                            size="small"
                            color="primary"
                            sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {/* Cost Specs */}
                    <Stack spacing={1.2} sx={{ mb: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Printing Cost
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          ₹{Math.round(row.printingCost).toLocaleString()}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Plate Cost
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          ₹{Math.round(row.plateCost).toLocaleString()}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Running Time
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                          {decimalTime}
                        </Typography>
                      </Box>
                    </Stack>

                    <Divider sx={{ mb: 2 }} />

                    {/* Total Cost */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: isCurrentlySelected ? 'primary.lighter' : row.isBest ? 'success.lighter' : 'action.hover', p: 1.5, borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'black', color: isCurrentlySelected ? 'primary.dark' : row.isBest ? 'success.dark' : 'text.primary' }}>
                        Total Cost
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 950, color: isCurrentlySelected ? 'primary.dark' : row.isBest ? 'success.dark' : 'text.primary' }}>
                        ₹{Math.round(row.totalCost).toLocaleString()}
                      </Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        /* STANDARD TABULAR VIEW WITH OVERRIDE CAPABILITY */
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.selected' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Machine Name</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Plates (Qty × Rate)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Plate Cost</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Run Rate</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Printing Cost</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Running Time</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Cost</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Efficiency Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {comparisons.map((row) => {
                const isCurrentlySelected = row.machineId === selectedMachineId;
                const decimalTime = formatDecimalHours(row.runningTimeHours, row.runningTimeMinutes);

                return (
                  <TableRow
                    key={row.machineId}
                    hover
                    onClick={() => onSelectMachine(row.machineId)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isCurrentlySelected
                        ? 'primary.lighter'
                        : row.isBest
                        ? 'success.lighter'
                        : 'inherit',
                      transition: 'background-color 0.2s',
                      '&:hover': {
                        bgcolor: isCurrentlySelected
                          ? 'primary.light'
                          : row.isBest
                          ? 'success.light'
                          : 'action.hover'
                      }
                    }}
                  >
                    {/* Machine Name */}
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: isCurrentlySelected ? 'primary.main' : 'text.primary' }}>
                          {row.machineName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          {row.machineCode}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Plates (Qty × Rate) */}
                    <TableCell align="right">
                      <Typography variant="body2">
                        {row.plateCount} × ₹{row.plateRate}
                      </Typography>
                    </TableCell>

                    {/* Plate Cost */}
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        ₹{Math.round(row.plateCost).toLocaleString()}
                      </Typography>
                    </TableCell>

                    {/* Run Rate */}
                    <TableCell align="right">
                      <Typography variant="caption" color="text.secondary">
                        ₹{row.printChargePer1000}/k
                      </Typography>
                    </TableCell>

                    {/* Printing Cost */}
                    <TableCell align="right">
                      <Typography variant="body2">
                        ₹{Math.round(row.printingCost).toLocaleString()}
                      </Typography>
                    </TableCell>

                    {/* Running Time */}
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {decimalTime}
                      </Typography>
                    </TableCell>

                    {/* Total Cost */}
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 900, color: row.isBest ? 'success.dark' : 'text.primary' }}>
                        ₹{Math.round(row.totalCost).toLocaleString()}
                      </Typography>
                    </TableCell>

                    {/* Efficiency Status / Selection */}
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        {row.isBest && (
                          <Chip
                            icon={<BestIcon sx={{ color: 'success.main', fontSize: '1rem' }} />}
                            label="Best Choice"
                            size="small"
                            color="success"
                            sx={{ fontWeight: 'bold', height: 20, fontSize: '0.65rem' }}
                          />
                        )}
                        {isCurrentlySelected ? (
                          <Chip
                            label="Active Selection"
                            size="small"
                            color="primary"
                            sx={{ fontWeight: 'bold', height: 20, fontSize: '0.65rem' }}
                          />
                        ) : (
                          <Chip
                            label="Click to Apply"
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem', cursor: 'pointer' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

