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
  Button,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Settings as SettingsIcon,
  TrendingUp as SpeedIcon,
  Layers as ColorsIcon,
  Storage as DbIcon,
  ArrowBack as ArrowBackIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { MachineMasterItem } from '../types';
import { MachineApiService } from '../services/api';
import MachineTable from './MachineTable';
import MachineForm from './MachineForm';

export default function MachineMaster() {
  const [machines, setMachines] = useState<MachineMasterItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<'list' | 'add' | 'edit'>('list');
  const [selectedMachine, setSelectedMachine] = useState<MachineMasterItem | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Load machines from the API service on mount
  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    setIsLoading(true);
    try {
      const data = await MachineApiService.getMachines();
      setMachines(data);
    } catch (e: any) {
      showToast(`Error fetching machine registry: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleDeleteMachine = async (id: string) => {
    setIsLoading(true);
    try {
      const target = machines.find((m) => m.id === id);
      await MachineApiService.deleteMachine(id);
      setMachines((prev) => prev.filter((m) => m.id !== id));
      showToast(
        `Machine '${target?.machineName || id}' successfully decommissioned from the active registry.`,
        'warning'
      );
    } catch (e: any) {
      showToast(`Error deleting machine: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMachine = async (newOrUpdatedMachine: MachineMasterItem) => {
    setIsLoading(true);
    try {
      if (currentView === 'edit') {
        const updated = await MachineApiService.updateMachine(newOrUpdatedMachine.id, newOrUpdatedMachine);
        setMachines((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m))
        );
        showToast(`Machine '${updated.machineName}' specifications successfully updated!`, 'success');
      } else {
        // Create machine expects Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>
        const { id, createdAt, updatedAt, ...creationParams } = newOrUpdatedMachine;
        const created = await MachineApiService.createMachine(creationParams);
        setMachines((prev) => [created, ...prev]);
        showToast(`New machine '${created.machineName}' registered in active service catalog!`, 'success');
      }
      setCurrentView('list');
    } catch (e: any) {
      showToast(`Error saving specifications: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk import callback handler
  const handleImportSuccess = async (importedMachines: MachineMasterItem[]) => {
    setIsLoading(true);
    try {
      const updatedList = [...machines];
      
      for (const m of importedMachines) {
        try {
          const { id, createdAt, updatedAt, ...creationParams } = m;
          const created = await MachineApiService.createMachine(creationParams);
          updatedList.unshift(created);
        } catch (err) {
          // If code exists, skip or print warning
          console.warn(`Skipping duplicate code ${m.machineCode}`);
        }
      }
      
      // Refresh current list after updates
      const refreshed = await MachineApiService.getMachines();
      setMachines(refreshed);
    } catch (e: any) {
      showToast(`Bulk import synchronization failed: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
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
    <Box sx={{ flexGrow: 1, position: 'relative' }}>
      {/* Top linear progress during sync */}
      {isLoading && (
        <LinearProgress 
          sx={{ 
            position: 'absolute', 
            top: -32, 
            left: -32, 
            right: -32, 
            height: 4, 
            zIndex: 10 
          }} 
        />
      )}

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

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {currentView === 'list' && (
            <Button
              id="btn-sync-api"
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<SyncIcon />}
              onClick={fetchMachines}
              disabled={isLoading}
              sx={{ textTransform: 'none', fontWeight: 'bold' }}
            >
              Sync DB
            </Button>
          )}
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
      </Box>

      {/* Stats Cards (Only shown in list view for dashboard context) */}
      {currentView === 'list' && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    ACTIVE MACHINERY
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                    {stats.active} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'normal' }}>/ {stats.total} Machines</span>
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(16, 185, 129, 0.1)', color: 'success.main', borderRadius: 2, display: 'flex' }}>
                  <DbIcon />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    AVG RUNNING SPEED
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
                    {stats.avgSpeed.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'normal' }}>Sheets/Hr</span>
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(37, 99, 235, 0.1)', color: 'primary.main', borderRadius: 2, display: 'flex' }}>
                  <SpeedIcon />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    MAX COLORS CAPACITY
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'secondary.main' }}>
                    {stats.maxColors}C <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'normal' }}>Offset tower</span>
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(139, 92, 246, 0.1)', color: 'secondary.main', borderRadius: 2, display: 'flex' }}>
                  <ColorsIcon />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    PERSISTENCE LAYER
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'info.main' }}>
                    PostgreSQL <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase' }}>● Sync Ready</span>
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(2, 132, 199, 0.1)', color: 'info.main', borderRadius: 2, display: 'flex' }}>
                  <SettingsIcon />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Panel Content with inline spinner overlay */}
      <Paper elevation={0} sx={{ border: 'none', background: 'transparent', position: 'relative' }}>
        {isLoading && machines.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12 }}>
            <CircularProgress color="primary" sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Synchronizing with Printopia Central DB Registry...
            </Typography>
          </Box>
        ) : currentView === 'list' ? (
          <MachineTable
            machines={machines}
            onEdit={handleEditClick}
            onDelete={handleDeleteMachine}
            onAddClick={handleAddClick}
            onImportSuccess={handleImportSuccess}
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
