/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import GSTInvoiceList from './GSTInvoiceList';
import CreateInvoiceForm from './CreateInvoiceForm';
import InvoiceDetailsView from './InvoiceDetailsView';
import InvoicePrintPreview from './InvoicePrintPreview';
import PaymentReceiptList from './PaymentReceiptList';
import CreatePaymentReceiptForm from './CreatePaymentReceiptForm';
import CustomerOutstandingView from './CustomerOutstandingView';
import CreditNoteList from './CreditNoteList';

interface BillingModuleProps {
  initialTab: 'gst-invoices' | 'payment-receipts' | 'customer-outstanding' | 'credit-notes';
}

type ViewState = 'LIST' | 'CREATE' | 'DETAILS' | 'PRINT';

export default function BillingModule({ initialTab }: BillingModuleProps) {
  const [viewState, setViewState] = useState<ViewState>('LIST');
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

  // Reset to list view whenever the parent tab changes
  useEffect(() => {
    setViewState('LIST');
    setActiveInvoiceId(null);
  }, [initialTab]);

  const handleInvoiceSuccess = () => {
    setViewState('LIST');
    setActiveInvoiceId(null);
  };

  const handlePaymentSuccess = () => {
    setViewState('LIST');
  };

  // Render sub-views based on activeTab and viewState
  const renderContent = () => {
    if (initialTab === 'gst-invoices') {
      switch (viewState) {
        case 'CREATE':
          return (
            <CreateInvoiceForm 
              onBack={() => setViewState('LIST')} 
              onSuccess={handleInvoiceSuccess} 
            />
          );
        case 'DETAILS':
          return activeInvoiceId ? (
            <InvoiceDetailsView 
              invoiceId={activeInvoiceId} 
              onBack={() => setViewState('LIST')} 
              onPrint={(id) => {
                setActiveInvoiceId(id);
                setViewState('PRINT');
              }}
            />
          ) : null;
        case 'PRINT':
          return activeInvoiceId ? (
            <InvoicePrintPreview 
              invoiceId={activeInvoiceId} 
              onBack={() => setViewState('DETAILS')} 
            />
          ) : null;
        case 'LIST':
        default:
          return (
            <GSTInvoiceList 
              onCreateClick={() => setViewState('CREATE')} 
              onViewDetails={(id) => {
                setActiveInvoiceId(id);
                setViewState('DETAILS');
              }}
              onPrintPreview={(id) => {
                setActiveInvoiceId(id);
                setViewState('PRINT');
              }}
            />
          );
      }
    }

    if (initialTab === 'payment-receipts') {
      switch (viewState) {
        case 'CREATE':
          return (
            <CreatePaymentReceiptForm 
              onBack={() => setViewState('LIST')} 
              onSuccess={handlePaymentSuccess} 
            />
          );
        case 'LIST':
        default:
          return (
            <PaymentReceiptList 
              onCreateClick={() => setViewState('CREATE')} 
            />
          );
      }
    }

    if (initialTab === 'customer-outstanding') {
      return <CustomerOutstandingView />;
    }

    if (initialTab === 'credit-notes') {
      return <CreditNoteList />;
    }

    return null;
  };

  return (
    <Box sx={{ width: '100%', p: { xs: 1.5, md: 3 } }}>
      {renderContent()}
    </Box>
  );
}
