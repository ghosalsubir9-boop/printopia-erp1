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
  CircularProgress,
  Alert,
  Grid,
  Card
} from '@mui/material';
import { CloudUpload, FilterList, CompareArrows } from '@mui/icons-material';
import { GstApiService } from '../services/gstApi';
import { Gstr2bReconciliationItem } from '../types';

export default function Gstr2bReconciliation() {
  const [items, setItems] = React.useState<Gstr2bReconciliationItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await GstApiService.getReconciliationData();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  const stats = items.reduce((acc, curr) => {
    acc[curr.matchStatus] = (acc[curr.matchStatus] || 0) + 1;
    return acc;
  }, {} as any);

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>GSTR-2B Reconciliation</Typography>
          <Typography variant="caption" color="text.secondary">
            Match your purchase register with auto-drafted GSTR-2B from GST Portal
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<FilterList />} variant="outlined" size="small">Filter</Button>
          <Button startIcon={<CloudUpload />} variant="contained" size="small">Import GSTR-2B</Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard label="Fully Matched" value={stats['Fully Matched'] || 0} color="success.main" />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard label="Missing in Books" value={stats['Missing in Books'] || 0} color="error.main" />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard label="Tax Mismatch" value={stats['Tax Mismatch'] || 0} color="warning.main" />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard label="Total Invoices" value={items.length} color="primary.main" />
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mb: 3 }} icon={<CompareArrows />}>
        Reconciliation matched by Supplier GSTIN, Invoice Number and Date. Unmatched ITC is not auto-claimed.
      </Alert>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>Supplier GSTIN</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Supplier Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Inv No</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Taxable</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">GST Amt</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Match Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} sx={item.matchStatus === 'Fully Matched' ? {} : { bgcolor: 'warning.lighter' }}>
                <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{item.supplierGstin}</TableCell>
                <TableCell>{item.supplierName}</TableCell>
                <TableCell>{item.invoiceNumber}</TableCell>
                <TableCell>{item.invoiceDate}</TableCell>
                <TableCell align="right">{item.taxableValue.toLocaleString()}</TableCell>
                <TableCell align="right">{(item.igst + item.cgst + item.sgst).toLocaleString()}</TableCell>
                <TableCell>
                  <Chip 
                    label={item.matchStatus} 
                    size="small" 
                    color={getStatusColor(item.matchStatus)}
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell sx={{ maxWidth: 200, fontSize: '0.75rem', color: 'text.secondary' }}>
                  {item.remarks || '-'}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    No GSTR-2B data has been imported for the selected period.
                  </Typography>
                  <Button startIcon={<CloudUpload />} variant="outlined" size="small" sx={{ mt: 2 }}>
                    Import GSTR-2B JSON
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <Card variant="outlined" sx={{ textAlign: 'center', p: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
      <Typography variant="h6" sx={{ fontWeight: 800, color }}>{value}</Typography>
    </Card>
  );
}

function getStatusColor(status: string): any {
  switch (status) {
    case 'Fully Matched': return 'success';
    case 'Partially Matched':
    case 'Tax Mismatch':
    case 'Value Mismatch': return 'warning';
    case 'Missing in Books':
    case 'Missing in GSTR-2B': return 'error';
    default: return 'default';
  }
}
