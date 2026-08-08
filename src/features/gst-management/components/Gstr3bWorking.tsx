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
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid
} from '@mui/material';
import { Download, FileDownload, PictureAsPdf } from '@mui/icons-material';
import { GstApiService } from '../services/gstApi';
import { GstPeriod } from '../types';
import { ExportUtils } from '../utils/exportUtils';

export default function Gstr3bWorking({ period }: { period: GstPeriod }) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const handleExportCsv = () => {
    const headers = ['Section', 'Details', 'Taxable Value', 'Integrated Tax', 'Central Tax', 'State/UT Tax', 'Cess'];
    const outwardRows = data.outward.map((r: any) => ['3.1 Outward', r.description, r.taxableValue, r.igst, r.cgst, r.sgst, r.cess]);
    const itcRows = data.itc.map((r: any) => ['4. ITC', r.description, '-', r.igst, r.cgst, r.sgst, r.cess]);
    ExportUtils.exportToCsv(`GSTR3B_Working_${period.month}_${period.year}.csv`, [headers, ...outwardRows, ...itcRows]);
  };

  React.useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const gstr3b = await GstApiService.getGstr3bData(period);
      setData(gstr3b);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  const totalLiability = data.outward.reduce((acc: any, curr: any) => ({
    igst: acc.igst + curr.igst,
    cgst: acc.cgst + curr.cgst,
    sgst: acc.sgst + curr.sgst
  }), { igst: 0, cgst: 0, sgst: 0 });

  const totalItc = data.itc[2]; // Net ITC

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>GSTR-3B Summary Working</Typography>
          <Typography variant="caption" color="text.secondary">
            Period: {period.month}/{period.year} | Status: {period.status}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Download />} variant="contained" size="small" onClick={handleExportCsv}>Export CSV</Button>
        </Stack>
      </Stack>

      {/* 3.1 Outward Supplies */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
        3.1 Details of Outward Supplies and inward supplies liable to reverse charge
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700, width: '40%' }}>Nature of Supplies</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Total Taxable Value</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Integrated Tax</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Central Tax</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">State/UT Tax</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Cess</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.outward.map((row: any, idx: number) => (
              <TableRow key={idx}>
                <TableCell>{row.description}</TableCell>
                <TableCell align="right">{row.taxableValue.toLocaleString()}</TableCell>
                <TableCell align="right">{row.igst.toLocaleString()}</TableCell>
                <TableCell align="right">{row.cgst.toLocaleString()}</TableCell>
                <TableCell align="right">{row.sgst.toLocaleString()}</TableCell>
                <TableCell align="right">{row.cess.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 4. Eligible ITC */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
        4. Eligible ITC
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700, width: '40%' }}>Details</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Integrated Tax</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Central Tax</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">State/UT Tax</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Cess</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.itc.map((row: any, idx: number) => (
              <TableRow key={idx} sx={idx === 2 ? { bgcolor: 'success.light', '& .MuiTableCell-root': { color: 'white', fontWeight: 700 } } : {}}>
                <TableCell>{row.description}</TableCell>
                <TableCell align="right">{row.igst.toLocaleString()}</TableCell>
                <TableCell align="right">{row.cgst.toLocaleString()}</TableCell>
                <TableCell align="right">{row.sgst.toLocaleString()}</TableCell>
                <TableCell align="right">{row.cess.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Tax Payment Summary */}
      <Card variant="outlined" sx={{ bgcolor: 'action.hover', border: '2px solid', borderColor: 'primary.light' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Estimated Tax Liability & Payment Summary</Typography>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="caption" color="text.secondary">Total Output Liability</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>
                ₹{(totalLiability.igst + totalLiability.cgst + totalLiability.sgst).toLocaleString()}
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                <Typography variant="caption">IGST: ₹{totalLiability.igst.toLocaleString()}</Typography>
                <Typography variant="caption">CGST: ₹{totalLiability.cgst.toLocaleString()}</Typography>
                <Typography variant="caption">SGST: ₹{totalLiability.sgst.toLocaleString()}</Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="caption" color="text.secondary">Total ITC Offset</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                ₹{(totalItc.igst + totalItc.cgst + totalItc.sgst).toLocaleString()}
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                <Typography variant="caption">IGST: ₹{totalItc.igst.toLocaleString()}</Typography>
                <Typography variant="caption">CGST: ₹{totalItc.cgst.toLocaleString()}</Typography>
                <Typography variant="caption">SGST: ₹{totalItc.sgst.toLocaleString()}</Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="caption" color="text.secondary">Net Cash Payable</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
                ₹{Math.max(0, (totalLiability.igst + totalLiability.cgst + totalLiability.sgst) - (totalItc.igst + totalItc.cgst + totalItc.sgst)).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 1 }}>
                * Liability after ITC adjustment
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
