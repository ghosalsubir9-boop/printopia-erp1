/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Paper, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableRow,
  Alert, Button, Stack, Chip, Divider, TextField
} from '@mui/material';
import { LayoutData } from '../types';
import { calculateLayout, validateLayout } from '../services/layoutEngine';
import { SheetLayoutView } from './SheetLayoutView';
import { LayoutLegend } from './LayoutLegend';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface UpsLayoutPreviewProps {
  layout: LayoutData | undefined;
  onLayoutChange: (newLayout: LayoutData) => void;
  productOpenWidth: number;
  productOpenHeight: number;
  parentWidth: number;
  parentHeight: number;
  machineWidth: number;
  machineHeight: number;
  gripperMargin: number;
  sideMargin: number;
  tailMargin: number;
  cuttingMethod: string;
  numMachineSheets: number;
  printingMethod: string;
}

export const UpsLayoutPreview = ({
  layout,
  onLayoutChange,
  productOpenWidth,
  productOpenHeight,
  parentWidth,
  parentHeight,
  machineWidth,
  machineHeight,
  gripperMargin,
  sideMargin,
  tailMargin,
  cuttingMethod,
  numMachineSheets,
  printingMethod
}: UpsLayoutPreviewProps) => {
  const [tab, setTab] = useState(0);
  const [comparison, setComparison] = useState<{ normal: LayoutData, rotated: LayoutData, suggested: LayoutData } | null>(null);

  useEffect(() => {
    if (productOpenWidth <= 0 || productOpenHeight <= 0 || machineWidth <= 0 || machineHeight <= 0) return;

    const res = calculateLayout({
      parentWidth, parentHeight,
      machineWidth, machineHeight,
      productWidth: productOpenWidth,
      productHeight: productOpenHeight,
      gripperMargin, sideMargin, tailMargin,
      cuttingMethod, numMachineSheets,
      printingMethod
    });
    setComparison(res);
    
    if (!layout || !layout.isManual) {
      onLayoutChange(res.suggested);
    }
  }, [
    productOpenWidth, productOpenHeight,
    parentWidth, parentHeight,
    machineWidth, machineHeight,
    gripperMargin, sideMargin, tailMargin,
    cuttingMethod, numMachineSheets,
    printingMethod
  ]);

  if (!comparison || !layout) return null;

  const handleOrientationToggle = () => {
    const newLayout = layout.orientation === 'Normal' ? comparison.rotated : comparison.normal;
    onLayoutChange({ ...newLayout, isManual: true });
  };

  const handleOverride = (field: 'across' | 'down', value: string) => {
    const val = value === '' ? 0 : parseInt(value);
    const newLayout = { ...layout, [field]: val, isManual: true };
    
    // Recalculate metrics
    newLayout.machineUps = newLayout.across * newLayout.down;
    newLayout.totalUps = newLayout.machineUps * numMachineSheets;
    
    const usedArea = newLayout.productWidth * newLayout.productHeight * newLayout.machineUps;
    const printableArea = newLayout.printableWidth * newLayout.printableHeight;
    newLayout.utilizationPercentage = Number((printableArea > 0 ? (usedArea / printableArea) * 100 : 0).toFixed(2));
    newLayout.wastePercentage = Number((100 - newLayout.utilizationPercentage).toFixed(2));
    
    onLayoutChange(newLayout);
  };

  const handleResetToSuggested = () => {
    onLayoutChange({ ...comparison.suggested, isManual: false });
  };

  const validation = validateLayout(layout);

  return (
    <Box sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: 'primary.main' }}>
        Section: UPS Layout Preview
        {layout.isManual && <Chip label="Manual Layout" size="small" color="warning" sx={{ ml: 2, fontWeight: 600 }} />}
      </Typography>

      <Grid container spacing={3}>
        {/* Left: Summary and Controls */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>Orientation & Controls</Typography>
            
            <Stack spacing={1.5}>
               <Box 
                onClick={() => onLayoutChange({ ...comparison.normal, isManual: true })}
                sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  border: '2px solid', 
                  cursor: 'pointer',
                  borderColor: layout.orientation === 'Normal' ? 'primary.main' : 'divider', 
                  bgcolor: layout.orientation === 'Normal' ? 'primary.50' : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>Layout A (Normal)</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{comparison.normal.across} × {comparison.normal.down} = {comparison.normal.machineUps} UPS</Typography>
                {comparison.suggested.orientation === 'Normal' && (
                  <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, fontWeight: 600 }}>
                    <CheckCircleIcon sx={{ fontSize: 14 }} /> Recommended
                  </Typography>
                )}
              </Box>

              <Box 
                onClick={() => onLayoutChange({ ...comparison.rotated, isManual: true })}
                sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  border: '2px solid', 
                  cursor: 'pointer',
                  borderColor: layout.orientation === 'Rotated' ? 'primary.main' : 'divider', 
                  bgcolor: layout.orientation === 'Rotated' ? 'primary.50' : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>Layout B (Rotated)</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{comparison.rotated.across} × {comparison.rotated.down} = {comparison.rotated.machineUps} UPS</Typography>
                {comparison.suggested.orientation === 'Rotated' && (
                  <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, fontWeight: 600 }}>
                    <CheckCircleIcon sx={{ fontSize: 14 }} /> Recommended
                  </Typography>
                )}
              </Box>

              <Grid container spacing={1}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Across"
                    type="number"
                    value={layout.across}
                    onChange={(e) => handleOverride('across', e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Down"
                    type="number"
                    value={layout.down}
                    onChange={(e) => handleOverride('down', e.target.value)}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 1 }} />

              <Stack direction="row" spacing={1}>
                <Button variant="outlined" size="small" onClick={handleOrientationToggle} fullWidth sx={{ borderRadius: 2, fontWeight: 600 }}>
                  Toggle Orientation
                </Button>
                {layout.isManual && (
                  <Button variant="text" size="small" onClick={handleResetToSuggested} color="secondary" sx={{ fontWeight: 600 }}>
                    Reset
                  </Button>
                )}
              </Stack>
            </Stack>

            <Box sx={{ mt: 3.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.primary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>Utilisation & Waste</Typography>
              <TableContainer component={Box}>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ pl: 0, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>Utilisation %</TableCell>
                      <TableCell align="right" sx={{ pr: 0, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: layout.utilizationPercentage > 75 ? 'success.main' : 'warning.main' }}>
                          {layout.utilizationPercentage}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 0, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>Waste %</TableCell>
                      <TableCell align="right" sx={{ pr: 0, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          {layout.wastePercentage}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 0, py: 1, borderBottom: 'none' }}>Total UPS (Parent)</TableCell>
                      <TableCell align="right" sx={{ pr: 0, py: 1, borderBottom: 'none' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                          {layout.totalUps}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {!validation.isValid && (
              <Alert icon={<WarningIcon fontSize="inherit" />} severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{validation.message}</Typography>
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Right: Visual Preview */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Tabs 
              value={tab} 
              onChange={(_, v) => setTab(v)} 
              variant="fullWidth" 
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                bgcolor: 'grey.50',
                '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '0.875rem' }
              }}
            >
              <Tab label="Machine Sheet Layout" />
              <Tab label="Parent Sheet Layout" />
              <Tab label="Plate Layout" />
            </Tabs>
            
            <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'white' }}>
              {tab === 0 && <SheetLayoutView layout={layout} type="Machine" title="Machine Sheet Arrangement" />}
              {tab === 1 && <SheetLayoutView layout={layout} type="Parent" title="Parent Sheet Cutting Plan" />}
              {tab === 2 && (
                <Box sx={{ textAlign: 'center', py: 10, width: '100%' }}>
                   <Typography variant="body1" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>Plate Layout Visualization</Typography>
                   <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                     Machine: {layout.printingMethod} | Plate Size: Not yet fully configured for this machine
                   </Typography>
                   <Box sx={{ mt: 4, opacity: 0.2, transform: 'scale(0.8)' }}>
                     <SheetLayoutView layout={layout} type="Machine" />
                   </Box>
                </Box>
              )}
              
              <LayoutLegend />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
