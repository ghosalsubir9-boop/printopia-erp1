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
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PdfIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { QuotationHeader, QuotationStatus } from '../types';
import { QuotationApiService } from '../services/api';

export default function QuotationList({ onEdit, onCreate, onView }: { 
  onEdit: (q: QuotationHeader) => void, 
  onCreate: () => void,
  onView: (q: QuotationHeader) => void 
}) {
  const [quotations, setQuotations] = useState<QuotationHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationHeader | null>(null);

  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    setLoading(true);
    const data = await QuotationApiService.getQuotations();
    setQuotations(data);
    setLoading(false);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, q: QuotationHeader) => {
    setAnchorEl(event.currentTarget);
    setSelectedQuotation(q);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedQuotation(null);
  };

  const getStatusColor = (status: QuotationStatus) => {
    switch (status) {
      case 'Accepted': return 'success';
      case 'Rejected': return 'error';
      case 'Sent': return 'info';
      case 'Expired': return 'warning';
      case 'Draft': return 'default';
      case 'Revised': return 'secondary';
      default: return 'default';
    }
  };

  const filteredQuotations = quotations.filter(q => 
    q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
          Quotation System (M-06)
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreate}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Create New Quotation
        </Button>
      </Box>

      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search quotations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 20 }} />
                  </InputAdornment>
                ),
              }
            }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Quotation #</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Sales Executive</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Products</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Valid Until</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredQuotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                    <Typography color="text.secondary">No quotations found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotations.map((q) => (
                  <TableRow key={q.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {q.quotationNumber}
                      {q.currentRevision > 0 && (
                        <Chip 
                          label={`R${q.currentRevision}`} 
                          size="small" 
                          color="secondary" 
                          variant="outlined" 
                          sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} 
                        />
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(q.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{q.customerName}</TableCell>
                    <TableCell>{q.salesExecutive || '-'}</TableCell>
                    <TableCell>{q.items.length} Items</TableCell>
                    <TableCell>{format(new Date(q.validUntil), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <Chip 
                        label={q.status} 
                        size="small" 
                        color={getStatusColor(q.status)} 
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton onClick={(e) => handleMenuOpen(e, q)}>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { onView(selectedQuotation!); handleMenuClose(); }}>
          <ViewIcon sx={{ mr: 1, fontSize: 18 }} /> View Details
        </MenuItem>
        <MenuItem onClick={() => { onEdit(selectedQuotation!); handleMenuClose(); }}>
          <EditIcon sx={{ mr: 1, fontSize: 18 }} /> Edit
        </MenuItem>
        <MenuItem onClick={async () => { 
          handleMenuClose(); 
          if(selectedQuotation) {
            try {
              const { DocumentPdfService } = await import('../../../utils/DocumentPdfService');
              const { CompanySettingsService } = await import('../../../services/CompanySettingsService');
              const companyDetails = CompanySettingsService.getSettings();
              await DocumentPdfService.generateQuotationPdf(selectedQuotation, companyDetails);
            } catch(e) {
              console.error(e);
              alert("Failed to generate PDF");
            }
          }
        }}>
          <PdfIcon sx={{ mr: 1, fontSize: 18 }} /> Export PDF
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); }}>
          <HistoryIcon sx={{ mr: 1, fontSize: 18 }} /> Revision History
        </MenuItem>
        <MenuItem sx={{ color: 'error.main' }} onClick={() => { handleMenuClose(); }}>
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}
