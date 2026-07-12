/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Description as FileIcon,
  InsertDriveFile as DocIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';
import { CustomerDocument } from '../types';
import { CustomerMasterService } from '../services/mockApi';

interface DocumentManagerProps {
  customerId: string;
}

export default function DocumentManager({ customerId }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [docType, setDocType] = useState<'GST Certificate' | 'Trade License' | 'Agreement' | 'Other'>('GST Certificate');
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [customerId]);

  const loadDocuments = () => {
    const list = CustomerMasterService.getDocuments(customerId);
    setDocuments(list);
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeStr = Number(sizeInMB) < 0.1 ? `${(file.size / 1024).toFixed(1)} KB` : `${sizeInMB} MB`;

    CustomerMasterService.addDocument({
      customerId,
      documentType: docType,
      fileName: file.name,
      fileSize: sizeStr,
      uploadedAt: new Date().toISOString()
    });

    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 3000);
    loadDocuments();
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Support mock default files for easy testing if they don't want to browse standard files
  const handleMockUpload = (mockName: string, mockSize: string) => {
    CustomerMasterService.addDocument({
      customerId,
      documentType: docType,
      fileName: mockName,
      fileSize: mockSize,
      uploadedAt: new Date().toISOString()
    });

    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 3000);
    loadDocuments();
  };

  const handleDelete = (docId: string) => {
    if (confirm('Are you sure you want to remove this document record?')) {
      CustomerMasterService.deleteDocument(docId);
      loadDocuments();
    }
  };

  return (
    <Box>
      <Grid container spacing={4}>
        {/* Left Side: Upload Vault */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Document Classification
              </Typography>

              <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                <InputLabel id="doc-type-upload-label">Document Class Type</InputLabel>
                <Select
                  labelId="doc-type-upload-label"
                  label="Document Class Type"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                >
                  <MenuItem value="GST Certificate">GST Certificate</MenuItem>
                  <MenuItem value="Trade License">Trade License</MenuItem>
                  <MenuItem value="Agreement">Rate Agreement Contracts</MenuItem>
                  <MenuItem value="Other">Other Regulatory Dossier</MenuItem>
                </Select>
              </FormControl>

              {/* Drag and Drop Zone */}
              <Box
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                sx={{
                  border: '2px dashed',
                  borderColor: dragActive ? 'primary.main' : 'divider',
                  borderRadius: 3,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: dragActive ? 'action.hover' : 'background.paper',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />
                <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  Drag & drop file here or click to browse
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supports PDF, PNG, JPG or DOC up to 10MB
                </Typography>
              </Box>

              {uploadSuccess && (
                <Alert icon={<SuccessIcon fontSize="inherit" />} severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                  Document successfully archived in database!
                </Alert>
              )}

              {/* Quick Mock Files Seed for rapid evaluation */}
              <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1, color: 'text.secondary' }}>
                  ⚡ Rapid Testing: Add Mock Regulatory Files
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ textTransform: 'none', fontSize: '0.7rem', py: 0.2 }}
                    onClick={() => handleMockUpload(`${docType.replace(/\s+/g, '_')}_Approved.pdf`, '1.8 MB')}
                  >
                    + Add Mock PDF
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ textTransform: 'none', fontSize: '0.7rem', py: 0.2 }}
                    onClick={() => handleMockUpload(`${docType.replace(/\s+/g, '_')}_Scan.jpg`, '640 KB')}
                  >
                    + Add Mock Image
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Document Archive List */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DocIcon color="primary" /> Archived Compliance Records ({documents.length})
              </Typography>

              <List sx={{ p: 0 }}>
                {documents.map((doc, i) => (
                  <React.Fragment key={doc.id}>
                    <ListItem sx={{ px: 1, py: 1.5 }}>
                      <ListItemIcon sx={{ minWidth: 42 }}>
                        <FileIcon color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 'bold', wordBreak: 'break-all' }}>
                            {doc.fileName}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                            <Chip
                              label={doc.documentType}
                              size="small"
                              color="secondary"
                              variant="outlined"
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              Size: {doc.fileSize}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Delete Document">
                          <IconButton edge="end" color="error" size="small" onClick={() => handleDelete(doc.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {i < documents.length - 1 && <Divider />}
                  </React.Fragment>
                ))}

                {documents.length === 0 && (
                  <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                    <FileIcon sx={{ fontSize: 48, opacity: 0.25, mb: 1 }} />
                    <Typography variant="body2">No regulatory compliance files archived yet.</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Upload the GSTIN Certificate, Trade License or SLA rates contract.
                    </Typography>
                  </Box>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
