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

export default function App() {
  const [activeModule, setActiveModule] = useState<'machines' | 'papers' | 'products' | 'customers'>('customers');

  return (
    <DashboardLayout activeModule={activeModule} onModuleChange={setActiveModule}>
      {activeModule === 'machines' ? (
        <MachineMaster />
      ) : activeModule === 'papers' ? (
        <PaperMaster />
      ) : activeModule === 'products' ? (
        <ProductMaster />
      ) : (
        <CustomerMaster />
      )}
    </DashboardLayout>
  );
}
