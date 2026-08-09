import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Print as PrintIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import { DocumentPdfService, DocumentType } from '../utils/DocumentPdfService';

interface DocumentPdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  documentType: DocumentType;
  documentData: any;
  companyDetails?: any;
}

export default function DocumentPdfPreviewModal({
  open,
  onClose,
  title,
  documentType,
  documentData,
  companyDetails
}: DocumentPdfPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (open && documentData) {
      setLoading(true);
      setError(null);
      DocumentPdfService.getPreviewBlobUrl(documentType, documentData, companyDetails)
        .then((url) => {
          if (active) {
            createdUrl = url;
            setBlobUrl(url);
            setLoading(false);
          } else {
            URL.revokeObjectURL(url);
          }
        })
        .catch((err) => {
          console.error('Failed to generate PDF preview:', err);
          if (active) {
            setError('Failed to generate PDF document preview. Please try again.');
            setLoading(false);
          }
        });
    } else {
      setBlobUrl(null);
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [open, documentType, documentData, companyDetails]);

  const docNumber =
    documentData?.quotationNumber ||
    documentData?.piNumber ||
    documentData?.invoiceNumber ||
    documentData?.jobCardNumber ||
    documentData?.challanNumber ||
    documentData?.dcNumber ||
    documentData?.receiptNumber ||
    documentData?.poNumber ||
    documentData?.grnNumber ||
    '';

  const modalTitle = title || `${documentType} ${docNumber ? `#${docNumber}` : ''}`;

  const handlePrint = async () => {
    try {
      await DocumentPdfService.printPdf(documentType, documentData, companyDetails);
    } catch (err) {
      console.error('Print failed', err);
      alert('Failed to launch browser print. Please try downloading the PDF.');
    }
  };

  const handleDownload = async () => {
    try {
      await DocumentPdfService.downloadPdf(documentType, documentData, companyDetails);
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download PDF document.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth paperProps={{ sx: { borderRadius: 3, height: '85vh' } }}>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'primary.main', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PdfIcon />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {modalTitle}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Print Document">
            <Button variant="contained" color="secondary" size="small" startIcon={<PrintIcon />} onClick={handlePrint}>
              Print
            </Button>
          </Tooltip>
          <Tooltip title="Download PDF File">
            <Button variant="contained" color="success" size="small" startIcon={<DownloadIcon />} onClick={handleDownload}>
              Download
            </Button>
          </Tooltip>
          <IconButton onClick={onClose} sx={{ color: 'white', ml: 1 }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4, gap: 2 }}>
            <CircularProgress size={48} />
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
              Preparing high-resolution PDF print preview...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
            <Button variant="outlined" onClick={handleDownload}>
              Try Direct Download
            </Button>
          </Box>
        ) : blobUrl ? (
          <iframe src={blobUrl} title="Document Preview" style={{ width: '100%', height: '100%', border: 'none' }} />
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between', bgcolor: 'background.paper' }}>
        <Typography variant="caption" color="text.secondary">
          Standard A4 Printable Layout • Printopia Document Engine
        </Typography>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Close Preview
        </Button>
      </DialogActions>
    </Dialog>
  );
}
