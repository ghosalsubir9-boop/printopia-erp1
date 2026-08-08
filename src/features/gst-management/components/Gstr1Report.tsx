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
  Tabs,
  Tab,
  Button,
  Stack,
  Card,
  CardContent,
  CircularProgress,
  Grid
} from '@mui/material';
import { Download, FileDownload } from '@mui/icons-material';
import { GstApiService } from '../services/gstApi';
import { GstPeriod } from '../types';
import { ExportUtils } from '../utils/exportUtils';

export default function Gstr1Report({ period }: { period: GstPeriod }) {
  const [activeTab, setActiveTab] = React.useState(0);
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const handleExportExcel = () => {
    // Basic export: combine all tabs into one CSV with section markers or just Export HSN
    // Let's export B2B as primary for Excel demo
    const headers = ['Section', 'GSTIN', 'Invoice No', 'Date', 'POS', 'Taxable Value', 'IGST', 'CGST', 'SGST'];
    const b2bRows = data.b2b.map((i: any) => ['B2B', i.gstin, i.invoiceNumber, i.invoiceDate, i.placeOfSupply, i.taxableValue, i.igst, i.cgst, i.sgst]);
    const b2csRows = data.b2cs.map((i: any) => ['B2CS', '-', '-', '-', i.placeOfSupply, i.taxableValue, i.igst, i.cgst, i.sgst]);
    ExportUtils.exportToCsv(`GSTR1_Working_${period.month}_${period.year}.csv`, [headers, ...b2bRows, ...b2csRows]);
  };

  const handleExportJson = () => {
    ExportUtils.exportToJson(`GSTR1_Return_Preparation_${period.month}_${period.year}.json`, data);
  };

  React.useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const gstr1 = await GstApiService.getGstr1Data(period);
      setData(gstr1);
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
          <Typography variant="h6" sx={{ fontWeight: 700 }}>GSTR-1 Working Paper</Typography>
          <Typography variant="caption" color="text.secondary">
            Period: {period.month}/{period.year} | Status: {period.status}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Download />} variant="outlined" size="small" onClick={handleExportExcel}>Export CSV</Button>
          <Button startIcon={<FileDownload />} variant="contained" size="small" onClick={handleExportJson}>GST Return Preparation JSON</Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`B2B (${data.b2b.length})`} />
          <Tab label={`B2CL (${data.b2cl.length})`} />
          <Tab label={`B2CS (${data.b2cs.length})`} />
          <Tab label={`CDNR (${data.cdnr.length})`} />
          <Tab label={`HSN Summary (${data.hsn.length})`} />
          <Tab label={`Documents (${data.docs.length})`} />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {activeTab === 0 && <B2BTable items={data.b2b} />}
          {activeTab === 1 && <B2CLTable items={data.b2cl} />}
          {activeTab === 2 && <B2CSTable items={data.b2cs} />}
          {activeTab === 3 && <CDNRTable items={data.cdnr} />}
          {activeTab === 4 && <HSNTable items={data.hsn} />}
          {activeTab === 5 && <DocsTable items={data.docs} />}
        </Box>
      </Paper>

      <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Section Summary</Typography>
          <Grid container spacing={2}>
            <SummaryItem label="Total Taxable Value" value={calculateTotal(data.b2b, 'taxableValue') + calculateTotal(data.b2cs, 'taxableValue')} />
            <SummaryItem label="Total IGST" value={calculateTotal(data.b2b, 'igst') + calculateTotal(data.b2cs, 'igst')} />
            <SummaryItem label="Total CGST" value={calculateTotal(data.b2b, 'cgst') + calculateTotal(data.b2cs, 'cgst')} />
            <SummaryItem label="Total SGST" value={calculateTotal(data.b2b, 'sgst') + calculateTotal(data.b2cs, 'sgst')} />
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

function B2BTable({ items }: any) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ fontWeight: 700 }}>GSTIN</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Invoice No</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>POS</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Taxable Value</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">IGST</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">CGST</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">SGST</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item: any, idx: number) => (
            <TableRow key={idx}>
              <TableCell>{item.gstin}</TableCell>
              <TableCell>{item.invoiceNumber}</TableCell>
              <TableCell>{item.invoiceDate}</TableCell>
              <TableCell>{item.placeOfSupply}</TableCell>
              <TableCell align="right">{item.taxableValue.toLocaleString()}</TableCell>
              <TableCell align="right">{item.igst.toLocaleString()}</TableCell>
              <TableCell align="right">{item.cgst.toLocaleString()}</TableCell>
              <TableCell align="right">{item.sgst.toLocaleString()}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow><TableCell colSpan={8} align="center">No B2B invoices found</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function B2CLTable({ items }: any) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ fontWeight: 700 }}>Invoice No</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>POS</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Taxable Value</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">IGST</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item: any, idx: number) => (
            <TableRow key={idx}>
              <TableCell>{item.invoiceNumber}</TableCell>
              <TableCell>{item.invoiceDate}</TableCell>
              <TableCell>{item.placeOfSupply}</TableCell>
              <TableCell align="right">{item.taxableValue.toLocaleString()}</TableCell>
              <TableCell align="right">{item.igst.toLocaleString()}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow><TableCell colSpan={5} align="center">No B2CL invoices found</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function B2CSTable({ items }: any) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ fontWeight: 700 }}>POS</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Rate</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Taxable Value</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">IGST</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">CGST</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">SGST</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item: any, idx: number) => (
            <TableRow key={idx}>
              <TableCell>{item.placeOfSupply}</TableCell>
              <TableCell>{item.gstRate}%</TableCell>
              <TableCell align="right">{item.taxableValue.toLocaleString()}</TableCell>
              <TableCell align="right">{item.igst.toLocaleString()}</TableCell>
              <TableCell align="right">{item.cgst.toLocaleString()}</TableCell>
              <TableCell align="right">{item.sgst.toLocaleString()}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow><TableCell colSpan={6} align="center">No B2CS transactions found</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function CDNRTable({ items }: any) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ fontWeight: 700 }}>Note No</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Note Date</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Invoice No</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Taxable Value</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">IGST</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item: any, idx: number) => (
            <TableRow key={idx}>
              <TableCell>{item.noteNumber}</TableCell>
              <TableCell>{item.noteDate}</TableCell>
              <TableCell>{item.originalInvoiceNumber}</TableCell>
              <TableCell>{item.noteType === 'C' ? 'Credit' : 'Debit'}</TableCell>
              <TableCell align="right">{item.taxableValue.toLocaleString()}</TableCell>
              <TableCell align="right">{item.igst.toLocaleString()}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow><TableCell colSpan={5} align="center">No CDNR records found</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function HSNTable({ items }: any) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ fontWeight: 700 }}>HSN/SAC</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>UQC</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Qty</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Taxable</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Tax Amt</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item: any, idx: number) => (
            <TableRow key={idx}>
              <TableCell>{item.hsnSac}</TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell>{item.uqc}</TableCell>
              <TableCell align="right">{item.totalQuantity.toLocaleString()}</TableCell>
              <TableCell align="right">{item.taxableValue.toLocaleString()}</TableCell>
              <TableCell align="right">{(item.igst + item.cgst + item.sgst).toLocaleString()}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow><TableCell colSpan={6} align="center">No HSN records found</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function DocsTable({ items }: any) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ fontWeight: 700 }}>Nature of Document</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Sr No From</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Sr No To</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Cancelled</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Net Issued</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item: any, idx: number) => (
            <TableRow key={idx}>
              <TableCell>{item.natureOfDocument}</TableCell>
              <TableCell>{item.fromSrNo}</TableCell>
              <TableCell>{item.toSrNo}</TableCell>
              <TableCell align="right">{item.totalNumber}</TableCell>
              <TableCell align="right">{item.cancelledNumber}</TableCell>
              <TableCell align="right">{item.netIssued}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow><TableCell colSpan={6} align="center">No document records found</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function SummaryItem({ label, value }: any) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
      <Typography variant="body1" sx={{ fontWeight: 700 }}>₹{value.toLocaleString()}</Typography>
    </Grid>
  );
}

function calculateTotal(items: any[], field: string) {
  return items.reduce((sum, item) => sum + (item[field] || 0), 0);
}
