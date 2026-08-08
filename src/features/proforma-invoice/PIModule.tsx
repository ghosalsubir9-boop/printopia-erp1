import React, { useState, useEffect } from 'react';
import { Box, Container, Alert, Button } from '@mui/material';
import PIList from './components/PIList';
import PIForm from './components/PIForm';
import PIDetails from './components/PIDetails';
import { ProformaInvoice } from './types';
import { PIApiService } from './services/api';
import { QuotationHeader } from '../quotation/types';

type ViewMode = 'list' | 'create' | 'edit' | 'details';

interface PIModuleProps {
  initialView?: ViewMode;
  initialQuotationData?: QuotationHeader | null;
  onConvertToProduction?: (pi: ProformaInvoice) => void;
}

export default function PIModule({ initialView = 'list', initialQuotationData, onConvertToProduction }: PIModuleProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [selectedPI, setSelectedPI] = useState<ProformaInvoice | null>(null);
  const [fromQuotation, setFromQuotation] = useState<QuotationHeader | null>(initialQuotationData || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuotationData) {
      const hasAccepted = initialQuotationData.items.some(i => i.options.some(o => o.status === 'Accepted'));
      if (!hasAccepted) {
        setError('No confirmed products selected for Proforma Invoice.');
        setViewMode('list');
      } else {
        setError(null);
        setViewMode('create');
        setFromQuotation(initialQuotationData);
      }
    }
  }, [initialQuotationData]);

  const handleCreateNew = () => {
    setError('Proforma Invoice cannot be created as a blank document. Please select a Quotation with confirmed product options and click "Create Proforma Invoice".');
    setViewMode('list');
  };

  const handleEdit = (pi: ProformaInvoice) => {
    setSelectedPI(pi);
    setFromQuotation(null);
    setError(null);
    setViewMode('edit');
  };

  const handleViewDetails = (pi: ProformaInvoice) => {
    setSelectedPI(pi);
    setViewMode('details');
  };

  const handleSave = (pi: ProformaInvoice) => {
    setSelectedPI(pi);
    setViewMode('details');
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedPI(null);
    setFromQuotation(null);
    setError(null);
  };

  const handleConvertToJobCard = (pi: ProformaInvoice) => {
    const check = PIApiService.canConvertToProduction(pi);
    if (!check.canConvert) {
      setError(check.reason || 'Cannot convert Proforma Invoice to Production.');
      return;
    }
    if (onConvertToProduction) {
      onConvertToProduction(pi);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {error && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {viewMode === 'list' && (
        <PIList 
          onCreateNew={handleCreateNew} 
          onViewDetails={handleViewDetails} 
          onEdit={handleEdit} 
          onConvertToProduction={handleConvertToJobCard}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <PIForm 
          initialData={selectedPI} 
          fromQuotation={fromQuotation}
          onSave={handleSave} 
          onCancel={handleBack} 
        />
      )}

      {viewMode === 'details' && selectedPI && (
        <PIDetails 
          invoice={selectedPI} 
          onBack={handleBack} 
          onEdit={handleEdit}
          onConvertToJobCard={handleConvertToJobCard}
          onUpdate={handleSave}
        />
      )}
    </Container>
  );
}
