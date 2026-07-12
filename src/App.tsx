/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import DashboardLayout from './features/machines/components/DashboardLayout';
import MachineMaster from './features/machines/components/MachineMaster';

export default function App() {
  return (
    <DashboardLayout>
      <MachineMaster />
    </DashboardLayout>
  );
}
