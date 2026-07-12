/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
  Grid,
  Card,
  CardContent,
  Snackbar,
  Alert,
  Slide,
  Button
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Settings as SettingsIcon,
  TrendingUp as SpeedIcon,
  Layers as ColorsIcon,
  Storage as DbIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { MachineMasterItem } from '../types';
import { initialMachineMasterItems } from '../seedData';
import MachineTable from './MachineTable';
import MachineForm from './MachineForm';

const STORAGE_KEY = 'printopia_machine_master_registry';

export default function MachineMaster() {
  const [machines, setMachines] = useState<MachineMasterItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing stored machine master items:', e);
      }
    }
    return initialMachineMasterItems;
  });

  const [currentView, setCurrentView] = useState<'list' | 'add' | 'edit'>('list');
  const [selectedMachine, setSelectedMachine] = useState<MachineMasterItem | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Save changes back to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(machines));
  }, [machines]);

  const showToast = (message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  const handleAddClick = () => {
    setSelectedMachine(null);
    setCurrentView('add');
  };

  const handleEditClick = (machine: MachineMasterItem) => {
    setSelectedMachine(machine);
    setCurrentView('edit');
  };

  const handleDeleteMachine = (id: string) => {
    const machineToDelete = machines.find((m) => m.id === id);
    setMachines((prev) => prev.filter((m) => m.id !== id));
    showToast(
      `Machine '${machineToDelete?.machineName || id}' successfully removed from the active registry.`,
      'warning'
    );
  };

  const handleSaveMachine = (newOrUpdatedMachine: MachineMasterItem) => {
    if (currentView === 'edit') {
      setMachines((prev) =>
        prev.map((m) => (m.id === newOrUpdatedMachine.id ? newOrUpdatedMachine : m))
      );
      showToast(`Machine '${newOrUpdatedMachine.machineName}' specifications successfully updated!`, 'success');
    } else {
      setMachines((prev) => [newOrUpdatedMachine, ...prev]);
      showToast(`New machine '${newOrUpdatedMachine.machineName}' registered in active service catalog!`, 'success');
    }
    setCurrentView('list');
  };

  const handleCancelForm = () => {
    setCurrentView('list');
    setSelectedMachine(null);
  };

  // Stats computation
  const stats = useMemo(() => {
    const total = machines.length;
    const active = machines.filter((m) => m.status === 'Active').length;
    const avgSpeed =
      machines.length > 0
        ? Math.round(machines.reduce((sum, m) => sum + m.avgSpeed, 0) / total)
        : 0;
    const maxColors =
      machines.length > 0 ? Math.max(...machines.map((m) => m.numColors)) : 0;

    return { total, active, avgSpeed, maxColors };
  }, [machines]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header and Breadcrumbs */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 1 }}>
            <Link underline="hover" color="inherit" href="#" onClick={(e) => { e.preventDefault(); setCurrentView('list'); }}>
              Printopia ERP
            </Link>
            <Typography color="text.primary" sx={{ fontWeight: 'medium' }}>
              Machine Master
            </Typography>
          </Breadcrumbs>
          <Typography variant="h4" color="text.primary" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
            {currentView === 'list' ? 'Machine Master Registry' : currentView === 'add' ? 'Register New Machine' : 'Edit Machine Specs'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {currentView === 'list'
              ? 'Configure press capacities, operational speeds, wastage coefficients, and non-print mechanical safety margin offsets.'
              : 'Supply exact engineering characteristics, setup costs, and margin variables below. Checked for strict validation limits.'}
          </Typography>
        </Box>

        {currentView !== 'list' && (
          <Button
            id="btn-back-to-list"
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => setCurrentView('list')}
            sx={{ textTransform: 'none', fontWeight: 'bold' }}
          >
            Back to Registry List
          </Button>
        )}
      </Box>

      {/* Stats Cards (Only shown in list view for dashboard context) */}
      {currentView === 'list' && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    ACTIVE MACHINERY
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                    {stats.active} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'normal' }}>/ {stats.total} Machines</span>
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bg: 'success.light', color: 'success.main', borderRadius: 2, display: 'flex' }}>
                  <DbIcon />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    AVG RUNNING SPEED
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
                    {stats.avgSpeed.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'normal' }}>Sheets/Hr</span>
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bg: 'primary.light', color: 'primary.main', borderRadius: 2, display: 'flex' }}>
                  <SpeedIcon />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    MAX COLORS CAPACITY
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'secondary.main' }}>
                    {stats.maxColors}C <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'normal' }}>Offset Coater</span>
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bg: 'secondary.light', color: 'secondary.main', borderRadius: 2, display: 'flex' }}>
                  <ColorsIcon />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    PERSISTENCE LAYER
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'info.main' }}>
                    LocalDB <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase' }}>● Active</span>
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bg: 'info.light', color: 'info.main', borderRadius: 2, display: 'flex' }}>
                  <SettingsIcon />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Panel Content */}
      <Paper elevation={0} sx={{ border: 'none', background: 'transparent' }}>
        {currentView === 'list' ? (
          <MachineTable
            machines={machines}
            onEdit={handleEditClick}
            onDelete={handleDeleteMachine}
            onAddClick={handleAddClick}
          />
        ) : (
          <MachineForm
            machine={selectedMachine}
            onSave={handleSaveMachine}
            onCancel={handleCancelForm}
            existingMachines={machines}
          />
        )}
      </Paper>

      {/* Snackbar alerts for actions confirmation */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%', fontWeight: 'medium', borderRadius: 2 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
