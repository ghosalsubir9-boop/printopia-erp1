/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Button,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { Download, Edit, InfoOutlined } from '@mui/icons-material';
import { GstApiService } from '../services/gstApi';
import { GstPeriod, PurchaseRegisterItem } from '../types';

export default function PurchaseRegister({ period }: { period: GstPeriod }) {
  const [items, setItems] = React.useState<PurchaseRegisterItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await GstApiService.getPurchaseRegister(period);
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>GST Purchase Register & ITC</Typography>
          <Typography variant="caption" color="text.secondary">
            Period: {period.month}/{period.year}
          </Typography>
        </Box>
      </Stack>

      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(37, 99, 235, 0.02)', borderStyle: 'dashed' }}>
        <InfoOutlined sx={{ fontSize: 48, color: 'primary.main', mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Purchase Invoice module is required</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mb: 3 }}>
          Purchase Invoice module is required for Purchase Register, ITC and GSTR-2B reconciliation. 
          ITC must not be derived from Stock Receipt (GRN) or Purchase Orders.
        </Typography>
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
          <Chip label="Eligible ITC: ₹0" variant="outlined" />
          <Chip label="Claimed ITC: ₹0" variant="outlined" />
          <Chip label="ITC Under Review: ₹0" variant="outlined" />
        </Stack>
      </Paper>
    </Box>
  );
}
