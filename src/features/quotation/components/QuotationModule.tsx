import React, { useState, useEffect } from 'react';
import QuotationList from './QuotationList';
import QuotationForm from './QuotationForm';
import QuotationDetails from './QuotationDetails';
import { QuotationHeader } from '../types';

interface QuotationModuleProps {
  initialView?: 'list' | 'create' | 'edit' | 'details';
  initialData?: any;
  onModuleChange?: (module: any) => void;
  onConvertToPI?: (quotation: QuotationHeader) => void;
}

export default function QuotationModule({ initialView = 'list', initialData, onModuleChange, onConvertToPI }: QuotationModuleProps) {
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'details'>(initialView);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationHeader | null>(null);
  const [importData, setImportData] = useState<any>(initialData);

  useEffect(() => {
    if (initialView) setView(initialView);
    if (initialData && initialView === 'create') setImportData(initialData);
  }, [initialView, initialData]);

  const handleCreate = () => {
    setSelectedQuotation(null);
    setImportData(null);
    setView('create');
  };

  const handleEdit = (q: QuotationHeader) => {
    setSelectedQuotation(q);
    setView('edit');
  };

  const handleViewDetails = (q: QuotationHeader) => {
    setSelectedQuotation(q);
    setView('details');
  };

  const handleSave = () => {
    setView('list');
    setSelectedQuotation(null);
  };

  return (
    <>
      {view === 'list' && (
        <QuotationList 
          onCreate={handleCreate} 
          onEdit={handleEdit} 
          onView={handleViewDetails} 
        />
      )}
      {(view === 'create' || view === 'edit') && (
        <QuotationForm 
          initialData={selectedQuotation} 
          importEstimateData={importData}
          onSave={handleSave} 
          onCancel={() => setView('list')} 
          onModuleChange={onModuleChange}
        />
      )}
      {view === 'details' && selectedQuotation && (
        <QuotationDetails 
          quotation={selectedQuotation} 
          onBack={() => setView('list')} 
          onEdit={handleEdit}
          onConvertToPI={onConvertToPI}
        />
      )}
    </>
  );
}
