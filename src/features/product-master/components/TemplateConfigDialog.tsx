/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Divider,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Layers as LayersIcon,
  PlayForWork as SpawnIcon,
  Description as TemplateIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { ProductTemplate, ProductCategory } from '../types';

interface TemplateConfigDialogProps {
  open: boolean;
  onClose: () => void;
  templates: ProductTemplate[];
  categories: ProductCategory[];
  onSpawn: (template: ProductTemplate) => void;
  onDeleteTemplate: (id: string) => void;
}

export default function TemplateConfigDialog({
  open,
  onClose,
  templates,
  categories,
  onSpawn,
  onDeleteTemplate
}: TemplateConfigDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TemplateIcon color="primary" /> Product Template Presets
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Because <strong>Products are Templates</strong> in Printopia ERP, everything is configurable. Choose a default preset below to instantly instantiate or pre-configure a customized, multi-paper specification sheet.
        </Typography>

        {templates.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">No custom templates registered.</Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {templates.map((temp) => {
              const cat = categories.find((c) => c.id === temp.categoryId);
              return (
                <Grid size={{ xs: 12, sm: 6 }} key={temp.id}>
                  <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {temp.templateName}
                        </Typography>
                        <Tooltip title="Delete Template Preset">
                          <Button size="small" color="error" variant="text" sx={{ minWidth: 30, p: 0.5 }} onClick={() => onDeleteTemplate(temp.id)}>
                            <DeleteIcon fontSize="small" />
                          </Button>
                        </Tooltip>
                      </Box>

                      <Chip
                        label={cat ? cat.name : 'Custom Category'}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ mb: 2 }}
                      />

                      <Stack spacing={1} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">Default Finished Size:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {temp.defaultSizes.finishedWidth}" × {temp.defaultSizes.finishedHeight}"
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">Colors (Side):</Typography>
                          <Typography variant="body2">
                            {temp.defaultPrintOptions.colors} ({temp.defaultPrintOptions.side})
                          </Typography>
                        </Box>

                        <Divider />

                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Allowed Paper stock types:</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {temp.defaultPaperOptions.paperTypes.map((pt, i) => (
                              <Chip key={i} label={pt} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                            ))}
                          </Box>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Pre-selected Finishing:</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {temp.defaultFinishingOptions.slice(0, 4).map((f, i) => (
                              <Chip key={i} label={f} size="small" color="success" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                            ))}
                            {temp.defaultFinishingOptions.length > 4 && (
                              <Chip label={`+${temp.defaultFinishingOptions.length - 4} more`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                            )}
                          </Box>
                        </Box>
                      </Stack>
                    </CardContent>

                    <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                      <Button
                        fullWidth
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<SpawnIcon />}
                        onClick={() => onSpawn(temp)}
                        sx={{ fontWeight: 'bold' }}
                      >
                        Create Product from Template
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" color="inherit">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
