/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Box, Alert, Button, Typography, Paper } from '@mui/material';
import DashboardLayout from './features/machines/components/DashboardLayout';
import MachineMaster from './features/machines/components/MachineMaster';
import PaperMaster from './features/paper-master/components/PaperMaster';
import ProductMaster from './features/product-master/components/ProductMaster';
import CustomerMaster from './features/customer-master/components/CustomerMaster';
import VendorMaster from './features/vendor-master/components/VendorMaster';
import EstimateEngine from './features/estimate/job-entry/components/EstimateEngine';
import QuotationModule from './features/quotation/components/QuotationModule';
import PIModule from './features/proforma-invoice/PIModule';
import ProductionModule from './features/production/components/ProductionModule';
import PurchaseDashboard from './features/purchase/components/PurchaseDashboard';
import InventoryModule from './features/inventory/components/InventoryModule';
import BillingModule from './features/billing/components/BillingModule';
import CompanySettingsView from './components/CompanySettingsView';
import HomeDashboard from './components/HomeDashboard';
import JobCardMaster from './features/production/components/JobCardMaster';
import GstManagementModule from './features/gst-management/components/GstManagementModule';
import PurchaseInvoiceModule from './features/purchase-invoice/components/PurchaseInvoiceModule';
import FinanceHub from './features/finance/components/FinanceHub';
import VoucherModule from './features/finance/components/Vouchers/VoucherModule';
import FinancialReportsHub from './features/finance/components/Reports/FinancialReportsHub';
import SuperAdminView from './components/SuperAdminView';
import LoginView from './components/LoginView';
import { AuthService } from './services/authService';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => AuthService.isAuthenticated());
  
  const currentUser = AuthService.getCurrentUser();

  const [activeModule, setActiveModule] = useState<string>(() => {
    const user = AuthService.getCurrentUser();
    if (user?.role === 'SUPER_ADMIN') return 'super-admin';
    return 'dashboard';
  });

  const [initialQuickData, setInitialQuickData] = useState<any>(null);
  const [initialQuotationData, setInitialQuotationData] = useState<any>(null);
  const [initialPIData, setInitialPIData] = useState<any>(null);
  const [initialPOData, setInitialPOData] = useState<any>(null);

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={() => {
      setIsAuthenticated(true);
      const user = AuthService.getCurrentUser();
      if (user?.role === 'SUPER_ADMIN') {
        setActiveModule('super-admin');
      } else {
        setActiveModule('dashboard');
      }
    }} />;
  }

  const isAllowed = currentUser ? AuthService.isModuleAllowed(currentUser.role, activeModule) : true;

  const handleConvertToProduction = (pi: any) => {
    setInitialPOData(pi);
    setActiveModule('production');
  };

  const handleConvertToQuotation = (data: any) => {
    setInitialQuotationData(data);
    setActiveModule('quotations');
  };

  const handleConvertToPI = (quotation: any) => {
    setInitialPIData(quotation);
    setActiveModule('proforma-invoices');
  };

  return (
    <DashboardLayout 
      activeModule={activeModule} 
      onLogout={() => setIsAuthenticated(false)}
      onModuleChange={(m) => {
        setActiveModule(m);
        if (m !== 'estimates') setInitialQuickData(null);
        if (m !== 'quotations') setInitialQuotationData(null);
        if (m !== 'proforma-invoices') setInitialPIData(null);
        if (m !== 'production') setInitialPOData(null);
      }}
    >
      {!isAllowed ? (
        <Box sx={{ p: 4, maxWidth: 650, mx: 'auto', textAlign: 'center', mt: 4 }}>
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
            <Alert severity="warning" sx={{ mb: 3, textAlign: 'left', fontWeight: 'bold' }}>
              Access Restricted ({currentUser?.role})
            </Alert>
            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
              Your current assigned system role (<strong>{currentUser?.role}</strong>) does not have authorization to access the <strong>{activeModule.toUpperCase()}</strong> module.
            </Typography>
            <Button variant="contained" onClick={() => setActiveModule(currentUser?.role === 'SUPER_ADMIN' ? 'super-admin' : 'dashboard')} sx={{ textTransform: 'none', borderRadius: 2 }}>
              Return to Dashboard
            </Button>
          </Paper>
        </Box>
      ) : activeModule === 'super-admin' ? (
        <SuperAdminView />
      ) : activeModule === 'dashboard' ? (
        <HomeDashboard onNavigate={setActiveModule} />
      ) : activeModule === 'machines' ? (
        <MachineMaster />
      ) : activeModule === 'papers' ? (
        <PaperMaster />
      ) : activeModule === 'products' ? (
        <ProductMaster />
      ) : activeModule === 'customers' ? (
        <CustomerMaster />
      ) : activeModule === 'vendors' ? (
        <VendorMaster />
      ) : activeModule === 'quotations' ? (
        <QuotationModule 
          initialView={initialQuotationData ? 'create' : 'list'} 
          initialData={initialQuotationData} 
          onModuleChange={setActiveModule}
          onConvertToPI={handleConvertToPI}
        />
      ) : activeModule === 'proforma-invoices' ? (
        <PIModule 
          initialView={initialPIData ? 'create' : 'list'}
          initialQuotationData={initialPIData}
          onConvertToProduction={handleConvertToProduction}
        />
      ) : activeModule === 'production' || activeModule === 'production-execution' || activeModule === 'production-machine-queue' ? (
        <ProductionModule
          initialPI={initialPOData}
          initialActiveTab={
            activeModule === 'production-execution' ? 1 :
            activeModule === 'production-machine-queue' ? 2 : 0
          }
        />
      ) : activeModule === 'job-cards' ? (
        <JobCardMaster />
      ) : activeModule === 'purchase-orders' || activeModule === 'grns' ? (
        <PurchaseDashboard initialTab={activeModule === 'grns' ? 'grns' : 'purchase-orders'} />
      ) : activeModule === 'inventory' ? (
        <InventoryModule />
      ) : activeModule === 'company-settings' ? (
        <CompanySettingsView />
      ) : activeModule === 'finance' ? (
        <FinanceHub />
      ) : activeModule === 'vouchers' ? (
        <VoucherModule />
      ) : activeModule === 'financial-reports' ? (
        <FinancialReportsHub />
      ) : activeModule === 'gst-reports' ? (
        <GstManagementModule />
      ) : activeModule === 'purchase-invoices' || activeModule === 'vendor-outstanding' ? (
        <PurchaseInvoiceModule initialTab={activeModule} />
      ) : activeModule === 'gst-invoices' || activeModule === 'payment-receipts' || activeModule === 'customer-outstanding' || activeModule === 'credit-notes' ? (
        <BillingModule initialTab={activeModule} />
      ) : (
        <EstimateEngine 
          initialFormMode={initialQuickData ? 'form' : 'list'} 
          initialFormData={initialQuickData} 
          onConvertToQuotation={handleConvertToQuotation}
        />
      )}
    </DashboardLayout>
  );
}
