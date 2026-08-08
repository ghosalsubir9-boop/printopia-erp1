/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Stack, Button } from '@mui/material';
import PurchaseOrderList from './PurchaseOrderList';
import PurchaseOrderForm from './PurchaseOrderForm';
import GRNForm from './GRNForm';
import GRNList from './GRNList';
import MaterialStockLedger from './MaterialStockLedger';
import PurchaseOrderPrint from './PurchaseOrderPrint';
import { PurchaseOrderHeader, GoodsReceiptNote } from '../types';
import { PurchaseApiService } from '../services/api';

interface PurchaseDashboardProps {
  initialTab?: 'purchase-orders' | 'grns';
}

export default function PurchaseDashboard({ initialTab = 'purchase-orders' }: PurchaseDashboardProps) {
  // Navigation states: 'list' | 'create' | 'edit' | 'grn-create' | 'grn-list' | 'grn-edit' | 'stock-list'
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'grn-create' | 'grn-list' | 'grn-edit' | 'stock-list'>('list');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderHeader | null>(null);
  const [grnToEdit, setGrnToEdit] = useState<GoodsReceiptNote | null>(null);
  
  // Print Dialogue Overlay
  const [openPrint, setOpenPrint] = useState(false);
  const [printPO, setPrintPO] = useState<PurchaseOrderHeader | null>(null);

  // Synchronize with parent routing changes (e.g. sidebar clicks)
  useEffect(() => {
    if (initialTab === 'grns') {
      setView('grn-list');
    } else {
      setView('list');
    }
  }, [initialTab]);

  const handleSavePO = () => {
    setView('list');
    setSelectedPO(null);
  };

  const handleSaveGRN = () => {
    setView('grn-list');
    setSelectedPO(null);
    setGrnToEdit(null);
  };

  const handleCancel = () => {
    if (view === 'grn-create') {
      setView('list');
    } else if (view === 'grn-edit') {
      setView('grn-list');
    } else {
      setView('list');
    }
    setSelectedPO(null);
    setGrnToEdit(null);
  };

  const handleEditGRN = async (grn: GoodsReceiptNote) => {
    try {
      const po = await PurchaseApiService.getPurchaseOrderById(grn.poId);
      if (po) {
        setSelectedPO(po);
        setGrnToEdit(grn);
        setView('grn-edit');
      }
    } catch (err) {
      console.error('Error fetching PO for editing GRN', err);
    }
  };

  // Standard callback for direct Print Action from rows
  const handleTriggerPrint = (po: PurchaseOrderHeader) => {
    setPrintPO(po);
    setOpenPrint(true);
  };

  const showTabs = view === 'list' || view === 'grn-list' || view === 'stock-list';

  return (
    <Box sx={{ p: 1.5 }}>
      {/* Tab Selection Header */}
      {showTabs && (
        <Box sx={{ mb: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', letterSpacing: '-0.5px', color: 'text.primary' }}>
              Printopia Purchase & Stock Control
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.85rem' }}>
              Configure supplier vendors, dispatch Purchase Orders, and record physical Goods Receipt entries with real-time stock updating.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ bgcolor: 'action.hover', p: 0.75, borderRadius: '24px', border: '1px solid', borderColor: 'divider' }}>
            <Button
              variant={view === 'list' ? 'contained' : 'text'}
              color="primary"
              size="small"
              onClick={() => setView('list')}
              sx={{ borderRadius: '20px', px: 2, fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'capitalize', boxShadow: view === 'list' ? 1 : 'none' }}
            >
              Purchase Orders
            </Button>
            <Button
              variant={view === 'grn-list' ? 'contained' : 'text'}
              color="secondary"
              size="small"
              onClick={() => setView('grn-list')}
              sx={{ borderRadius: '20px', px: 2, fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'capitalize', boxShadow: view === 'grn-list' ? 1 : 'none' }}
            >
              Goods Receipt (GRN)
            </Button>
            <Button
              variant={view === 'stock-list' ? 'contained' : 'text'}
              color="info"
              size="small"
              onClick={() => setView('stock-list')}
              sx={{ borderRadius: '20px', px: 2, fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'capitalize', boxShadow: view === 'stock-list' ? 1 : 'none' }}
            >
              Material Stock Ledger
            </Button>
          </Stack>
        </Box>
      )}

      {/* Active Inner View Switcher */}
      {view === 'list' && (
        <PurchaseOrderList
          onAddPO={() => {
            setSelectedPO(null);
            setView('create');
          }}
          onEditPO={(po) => {
            setSelectedPO(po);
            setView('edit');
          }}
          onViewPO={handleTriggerPrint}
          onPrintPO={handleTriggerPrint}
          onReceiveGRN={(po) => {
            setSelectedPO(po);
            setView('grn-create');
          }}
        />
      )}

      {view === 'create' && (
        <PurchaseOrderForm
          po={null}
          onSave={handleSavePO}
          onCancel={handleCancel}
        />
      )}

      {view === 'edit' && (
        <PurchaseOrderForm
          po={selectedPO}
          onSave={handleSavePO}
          onCancel={handleCancel}
        />
      )}

      {view === 'grn-create' && selectedPO && (
        <GRNForm
          po={selectedPO}
          onSave={handleSaveGRN}
          onCancel={handleCancel}
        />
      )}

      {view === 'grn-list' && (
        <GRNList onEditGRN={handleEditGRN} />
      )}

      {view === 'grn-edit' && selectedPO && grnToEdit && (
        <GRNForm
          po={selectedPO}
          grnToEdit={grnToEdit}
          onSave={handleSaveGRN}
          onCancel={handleCancel}
        />
      )}

      {view === 'stock-list' && (
        <MaterialStockLedger />
      )}

      {/* Global Invoice Print Modal Overlay */}
      <PurchaseOrderPrint
        open={openPrint}
        onClose={() => {
          setOpenPrint(false);
          setPrintPO(null);
        }}
        po={printPO}
      />
    </Box>
  );
}
