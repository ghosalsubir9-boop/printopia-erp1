/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Box, Paper } from '@mui/material';
import PurchaseInvoiceList from './PurchaseInvoiceList';
import CreatePurchaseInvoiceForm from './CreatePurchaseInvoiceForm';
import PurchaseInvoiceDetails from './PurchaseInvoiceDetails';
import VendorOutstandingView from './VendorOutstandingView';
import CreateVendorPaymentForm from './CreateVendorPaymentForm';
import CreateCnDnForm from './CreateCnDnForm';
import Gstr2bReconciliationView from './Gstr2bReconciliationView';

interface PurchaseInvoiceModuleProps {
  initialTab: 'purchase-invoices' | 'vendor-outstanding';
}

type ViewState = 'LIST' | 'CREATE' | 'DETAILS' | 'CREATE_PAYMENT' | 'CREATE_CN_DN' | 'RECONCILIATION';

export default function PurchaseInvoiceModule({ initialTab }: PurchaseInvoiceModuleProps) {
  const [viewState, setViewState] = useState<ViewState>('LIST');
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

  // Reset to list view whenever parent tab changes
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

  const handleCnDnSuccess = () => {
    setViewState('LIST');
  };

  const renderContent = () => {
    if (initialTab === 'purchase-invoices') {
      switch (viewState) {
        case 'CREATE':
          return (
            <CreatePurchaseInvoiceForm
              onBack={() => setViewState('LIST')}
              onSuccess={handleInvoiceSuccess}
            />
          );
        case 'DETAILS':
          return activeInvoiceId ? (
            <PurchaseInvoiceDetails
              invoiceId={activeInvoiceId}
              onBack={() => setViewState('LIST')}
            />
          ) : null;
        case 'RECONCILIATION':
          return (
            <Gstr2bReconciliationView
              onBack={() => setViewState('LIST')}
            />
          );
        case 'LIST':
        default:
          return (
            <PurchaseInvoiceList
              onCreateClick={() => setViewState('CREATE')}
              onViewDetails={(id) => {
                setActiveInvoiceId(id);
                setViewState('DETAILS');
              }}
              onGstr2bClick={() => setViewState('RECONCILIATION')}
              onOutstandingClick={() => setViewState('LIST')} // already on list tab
            />
          );
      }
    }

    if (initialTab === 'vendor-outstanding') {
      switch (viewState) {
        case 'CREATE_PAYMENT':
          return (
            <CreateVendorPaymentForm
              onBack={() => setViewState('LIST')}
              onSuccess={handlePaymentSuccess}
            />
          );
        case 'CREATE_CN_DN':
          return (
            <CreateCnDnForm
              onBack={() => setViewState('LIST')}
              onSuccess={handleCnDnSuccess}
            />
          );
        case 'LIST':
        default:
          return (
            <VendorOutstandingView
              onRecordPaymentClick={() => setViewState('CREATE_PAYMENT')}
              onCreateCnDnClick={() => setViewState('CREATE_CN_DN')}
            />
          );
      }
    }

    return null;
  };

  return (
    <Box sx={{ py: 1.5, px: 2 }}>
      {renderContent()}
    </Box>
  );
}
