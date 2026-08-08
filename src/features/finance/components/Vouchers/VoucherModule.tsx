/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import VoucherList from './VoucherList';
import VoucherForm from './VoucherForm';
import VoucherDetails from './VoucherDetails';
import { VoucherType } from '../../types/voucher';

export default function VoucherModule() {
  const [view, setView] = useState<'list' | 'create' | 'details'>('list');
  const [voucherType, setVoucherType] = useState<VoucherType>('Journal');
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);

  const handleNewVoucher = (type: VoucherType) => {
    setVoucherType(type);
    setView('create');
  };

  const handleViewVoucher = (id: string) => {
    setSelectedVoucherId(id);
    setView('details');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedVoucherId(null);
  };

  return (
    <>
      {view === 'list' && (
        <VoucherList 
          onNewVoucher={handleNewVoucher} 
          onViewVoucher={handleViewVoucher} 
        />
      )}
      {view === 'create' && (
        <VoucherForm 
          voucherType={voucherType} 
          onBack={handleBackToList} 
        />
      )}
      {view === 'details' && selectedVoucherId && (
        <VoucherDetails 
          voucherId={selectedVoucherId} 
          onBack={handleBackToList} 
        />
      )}
    </>
  );
}
