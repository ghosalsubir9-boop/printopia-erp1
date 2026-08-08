/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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

export default function App() {
  const [activeModule, setActiveModule] = useState<'dashboard' | 'machines' | 'papers' | 'products' | 'customers' | 'vendors' | 'estimates' | 'quotations' | 'proforma-invoices' | 'production' | 'purchase-orders' | 'grns' | 'inventory' | 'gst-invoices' | 'payment-receipts' | 'customer-outstanding' | 'credit-notes' | 'company-settings' | 'job-cards' | 'gst-reports' | 'purchase-invoices' | 'vendor-outstanding' | 'finance' | 'vouchers' | 'financial-reports'>('dashboard');
  const [initialQuickData, setInitialQuickData] = useState<any>(null);
  const [initialQuotationData, setInitialQuotationData] = useState<any>(null);
  const [initialPIData, setInitialPIData] = useState<any>(null);
  const [initialPOData, setInitialPOData] = useState<any>(null);

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
    <DashboardLayout activeModule={activeModule} onModuleChange={(m) => {
      setActiveModule(m);
      if (m !== 'estimates') setInitialQuickData(null);
      if (m !== 'quotations') setInitialQuotationData(null);
      if (m !== 'proforma-invoices') setInitialPIData(null);
      if (m !== 'production') setInitialPOData(null);
    }}>
      {activeModule === 'dashboard' ? (
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
      ) : activeModule === 'production' ? (
        <ProductionModule initialPI={initialPOData} />
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
