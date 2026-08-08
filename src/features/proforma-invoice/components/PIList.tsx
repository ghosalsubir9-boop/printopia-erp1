import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PdfIcon,
  AssignmentTurnedIn as JobCardIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ProformaInvoice, PIStatus } from '../types';
import { PIApiService } from '../services/api';

interface PIListProps {
  onCreateNew: () => void;
  onViewDetails: (pi: ProformaInvoice) => void;
  onEdit: (pi: ProformaInvoice) => void;
  onConvertToProduction?: (pi: ProformaInvoice) => void;
}

export default function PIList({ onCreateNew, onViewDetails, onEdit, onConvertToProduction }: PIListProps) {
  const [invoices, setInvoices] = useState<ProformaInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPI, setSelectedPI] = useState<ProformaInvoice | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    const data = await PIApiService.getInvoices();
    setInvoices(data);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, pi: ProformaInvoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedPI(pi);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPI(null);
  };

  const handleDelete = async () => {
    if (selectedPI) {
      if (confirm('Are you sure you want to delete this Proforma Invoice?')) {
        await PIApiService.deleteInvoice(selectedPI.id);
        loadInvoices();
      }
    }
    handleMenuClose();
  };

  const handleConvert = () => {
    if (selectedPI && onConvertToProduction) {
      onConvertToProduction(selectedPI);
    }
    handleMenuClose();
  };

  const getStatusColor = (status: PIStatus) => {
    switch (status) {
      case 'Draft': return 'default';
      case 'Sent': return 'info';
      case 'Accepted': return 'success';
      case 'Partially Paid': return 'warning';
      case 'Paid': return 'success';
      case 'Production Approved': return 'primary';
      case 'Converted to Production': return 'secondary';
      case 'Cancelled': return 'error';
      default: return 'default';
    }
  };

  const filteredInvoices = invoices.filter(i => {
    const matchesSearch = i.piNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch && (i.isLatest !== false);
  });

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
            Proforma Invoices
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your proforma invoices and payments
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateNew}
          sx={{ borderRadius: 3, px: 3, py: 1.5, fontWeight: 'bold', textTransform: 'none', boxShadow: 3 }}
        >
          Create Proforma Invoice
        </Button>
      </Box>

      <Card sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Search by PI #, Customer, or Quote #"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }
            }}
          />
          <Button startIcon={<FilterIcon />} variant="outlined" sx={{ borderRadius: 2 }}>
            Filters
          </Button>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>PI Number</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Quote Ref</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Balance</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">No proforma invoices found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((pi) => (
                  <TableRow key={pi.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>{pi.piNumber}</TableCell>
                    <TableCell>{format(new Date(pi.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>{pi.customerName}</TableCell>
                    <TableCell>{pi.quotationNumber}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>₹ {pi.grandTotal.toLocaleString()}</TableCell>
                    <TableCell sx={{ color: (pi.balanceDue ?? pi.balanceAmount) > 0 ? 'error.main' : 'success.main', fontWeight: 'bold' }}>
                      ₹ {(pi.balanceDue ?? pi.balanceAmount ?? 0).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={pi.status} 
                        size="small" 
                        color={getStatusColor(pi.status)} 
                        sx={{ fontWeight: 'bold', fontSize: '0.7rem' }} 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, pi)}>
                        <MoreIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => { if (selectedPI) onViewDetails(selectedPI); handleMenuClose(); }}>
          <ViewIcon sx={{ mr: 1, fontSize: 18 }} /> View Details
        </MenuItem>
        <MenuItem 
          onClick={() => { if (selectedPI) onEdit(selectedPI); handleMenuClose(); }}
          disabled={selectedPI?.status === 'Cancelled' || selectedPI?.status === 'Production Approved' || selectedPI?.status === 'Converted to Production'}
        >
          <EditIcon sx={{ mr: 1, fontSize: 18 }} /> Edit
        </MenuItem>
        <MenuItem 
          onClick={handleConvert}
          disabled={!selectedPI || !PIApiService.canConvertToProduction(selectedPI).canConvert}
        >
          <JobCardIcon sx={{ mr: 1, fontSize: 18 }} /> Convert to Production
        </MenuItem>
        <MenuItem onClick={async () => {
          handleMenuClose();
          if (selectedPI) {
            try {
              const { DocumentPdfService } = await import('../../../utils/DocumentPdfService');
              const { CompanySettingsService } = await import('../../../services/CompanySettingsService');
              const companyDetails = CompanySettingsService.getSettings();
              await DocumentPdfService.generateProformaInvoicePdf(selectedPI, companyDetails);
            } catch (e) {
              console.error(e);
              alert("Failed to generate PDF");
            }
          }
        }}>
          <PdfIcon sx={{ mr: 1, fontSize: 18 }} /> Download PDF
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}
