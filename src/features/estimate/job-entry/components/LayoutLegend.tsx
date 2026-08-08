/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { Box, Typography, Stack } from '@mui/material';

export const LayoutLegend = () => {
  const items = [
    { color: '#e3f2fd', border: '#1976d2', label: 'Product UPS' },
    { color: 'url(#legendHatch)', border: 'none', label: 'Gripper', hatch: true },
    { color: '#ffebee', border: '#ef9a9a', label: 'Tail Margin', dashed: true },
    { color: '#eee', border: 'none', label: 'Side Margins' },
    { color: 'white', border: '#d32f2f', label: 'Cutting Line', dashed: true },
    { color: 'white', border: '#2196f3', label: 'Printable Area', dashed: true },
  ];

  return (
    <Box sx={{ mt: 2, p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fafafa' }}>
      <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block', color: 'text.secondary', textTransform: 'uppercase' }}>
        Layout Legend
      </Typography>
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }} useFlexGap>
        {items.map((item, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 16, height: 16,
              bgcolor: item.hatch ? 'transparent' : item.color,
              border: item.border !== 'none' ? `1px ${item.dashed ? 'dashed' : 'solid'} ${item.border}` : 'none',
              borderRadius: 0.5,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {item.hatch && (
                <svg width="100%" height="100%">
                   <defs>
                    <pattern id="legendHatch" patternUnits="userSpaceOnUse" width="6" height="6">
                      <path d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2" stroke="#ef5350" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#legendHatch)" />
                </svg>
              )}
            </Box>
            <Typography variant="caption">{item.label}</Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};
