/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Button,
  Tabs,
  Tab
} from '@mui/material';
import {
  Calculate as EstimateIcon,
  ChevronRight as ChevronIcon,
  Assignment as ListIcon,
  Add as AddIcon,
  PriorityHigh as UrgentIcon,
  BatchPrediction as BatchIcon,
  Group as GroupIcon,
  AutoAwesome as AutoIcon,
  Layers as PlatesIcon,
  Speed as ImpressionIcon
} from '@mui/icons-material';

import { EstimateJob } from '../types';
import { EstimateApiService } from '../services/api';
import EstimateList from './EstimateList';
import EstimateForm from './EstimateForm';
import PaperIntelligenceEngine from './PaperIntelligenceEngine';
import { PlateWorkspace } from '../../plate-engine';
import { ImpressionWorkspace } from '../../impression-engine';
import { PrintingCostWorkspace } from '../../printing-cost';
import FinishingWorkspace from '../../finishing-engine/components/FinishingWorkspace';
import { AutoFixHigh as FinishingIcon } from '@mui/icons-material';

export default function EstimateEngine({ initialFormMode, initialFormData, onConvertToQuotation }: { 
  initialFormMode?: 'list' | 'form', 
  initialFormData?: any,
  onConvertToQuotation?: (data: any) => void
}) {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [jobs, setJobs] = useState<EstimateJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'list' | 'form'>(initialFormMode || 'list');
  const [editingJob, setEditingJob] = useState<EstimateJob | null>(initialFormData || null);

  useEffect(() => {
    if (initialFormMode) setViewMode(initialFormMode);
    if (initialFormData) setEditingJob(initialFormData);
  }, [initialFormMode, initialFormData]);

  // Snackbar alerts
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Load jobs on mount
  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await EstimateApiService.getEstimates();
      setJobs(data);
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: 'Failed to retrieve estimate jobs registry.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // Handle Form Submit (POST or PUT)
  const handleFormSubmit = async (
    formData: Omit<EstimateJob, 'id' | 'estimateNumber' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      if (editingJob) {
        // PUT /estimate/:id
        const updated = await EstimateApiService.updateEstimate(editingJob.id, formData);
        setSnackbar({
          open: true,
          message: `Successfully updated Estimate Specs: ${updated.estimateNumber}`,
          severity: 'success'
        });
      } else {
        // POST /estimate
        const created = await EstimateApiService.createEstimate(formData);
        setSnackbar({
          open: true,
          message: `Successfully registered job card under Estimate: ${created.estimateNumber}`,
          severity: 'success'
        });
      }
      setViewMode('list');
      setEditingJob(null);
      await loadJobs(); // Refresh registry
    } catch (err: any) {
      console.error(err);
      setSnackbar({
        open: true,
        message: err.message || 'Operation failed. Please review your configurations.',
        severity: 'error'
      });
    }
  };

  // Handle Delete
  const handleDeleteJob = async (id: string) => {
    try {
      await EstimateApiService.deleteEstimate(id);
      setSnackbar({
        open: true,
        message: 'Estimate specification deleted from database registry.',
        severity: 'success'
      });
      await loadJobs();
    } catch (err: any) {
      console.error(err);
      setSnackbar({
        open: true,
        message: err.message || 'Failed to delete estimate card.',
        severity: 'error'
      });
    }
  };

  // --- KPI STATISTICS CARD CALCULATIONS ---
  const stats = {
    totalCount: jobs.length,
    urgentCount: jobs.filter((j) => j.priority !== 'Normal').length,
    totalQuantity: jobs.reduce((sum, j) => sum + j.finalQuantity, 0),
    uniqueCustomers: new Set(jobs.map((j) => j.customerId)).size
  };

  return (
    <Box sx={{ py: 1 }}>
      {/* Breadcrumb Navigation */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs separator={<ChevronIcon sx={{ fontSize: '0.85rem' }} />} aria-label="breadcrumb">
          <Link underline="hover" color="inherit" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
            Printopia ERP
          </Link>
          <Link underline="hover" color="inherit" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
            Estimates & Costing
          </Link>
          <Typography color="text.primary" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
            {activeTab === 1
              ? 'Paper Intelligence Workspace (M-05)'
              : activeTab === 2
                ? 'Plate Intelligence Workspace (M-05)'
                : activeTab === 3
                  ? 'Impression Intelligence Workspace (M-05)'
                  : activeTab === 4
                    ? 'Printing Cost Intelligence Workspace (M-05)'
                    : activeTab === 5
                      ? 'Finishing Cost Intelligence Workspace (M-05)'
                      : 'Estimate Engine (M-05)'}
          </Typography>
        </Breadcrumbs>

        {/* Dynamic Headers */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, tracking: '-0.5px' }}>
              {activeTab === 1
                ? 'Paper Intelligence Engine'
                : activeTab === 2
                  ? 'Plate Intelligence Engine'
                  : activeTab === 3
                    ? 'Impression Intelligence Engine'
                    : activeTab === 4
                      ? 'Printing Cost Engine'
                      : activeTab === 5
                        ? 'Finishing Cost Engine'
                        : viewMode === 'list'
                          ? 'Job Specification Registry'
                          : editingJob
                            ? `Modify Job Specs: ${editingJob.estimateNumber}`
                            : 'Configure New Job Entry'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {activeTab === 1
                ? 'Run real-time automated paper layouts and cutting computations. Highlighting best Parent Sheet & Machine Press matches.'
                : activeTab === 2
                  ? 'Calculate plate quantity, cost, savings and match optimized printing methods based on press configurations.'
                  : activeTab === 3
                    ? 'Calculate exact press machine impressions, running time, and setup waste allowances based on press configurations.'
                    : activeTab === 4
                      ? 'Simulate professional offset printing run rates, plate setup costs, and aggregate printing overheads.'
                      : activeTab === 5
                        ? 'Calculate and configure post-printing finishing operations and post-press binding cost structures.'
                        : viewMode === 'list'
                          ? 'Create, manage, and verify all pre-calculation parameters before triggering the paper estimator.'
                          : 'Form validation enforces strict constraints on customer, quantities, sizes, and paper types.'}
            </Typography>
          </Box>
          {activeTab === 0 && viewMode === 'list' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingJob(null);
                setViewMode('form');
              }}
              sx={{ borderRadius: '8px', fontWeight: 'bold', textTransform: 'none' }}
            >
              Create Estimate
            </Button>
          )}
        </Box>

        {/* Tab switch bar */}
        {viewMode === 'list' && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab icon={<ListIcon sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="Job Specifications" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
              <Tab icon={<AutoIcon sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="Paper Intelligence Workspace" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
              <Tab icon={<PlatesIcon sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="Plate Intelligence Workspace" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
              <Tab icon={<ImpressionIcon sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="Impression Workspace" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
              <Tab icon={<EstimateIcon sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="Printing Cost Engine" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
              <Tab icon={<FinishingIcon sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="Finishing Cost Engine" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
            </Tabs>
          </Box>
        )}
      </Box>

      {/* KPI Dashboard Cards (Only visible in list mode and specs tab) */}
      {activeTab === 0 && viewMode === 'list' && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Total Estimates Card */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, bgcolor: 'primary.lighter', color: 'primary.main', borderRadius: 3.5, display: 'flex' }}>
                  <ListIcon sx={{ fontSize: '1.5rem' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Total Estimates
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {loading ? <CircularProgress size={16} /> : stats.totalCount}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Urgent Jobs Card */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, bgcolor: 'error.lighter', color: 'error.main', borderRadius: 3.5, display: 'flex' }}>
                  <UrgentIcon sx={{ fontSize: '1.5rem' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Urgent/Very Urgent
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {loading ? <CircularProgress size={16} /> : stats.urgentCount}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Run Quantity Card */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, bgcolor: 'warning.lighter', color: 'warning.dark', borderRadius: 3.5, display: 'flex' }}>
                  <BatchIcon sx={{ fontSize: '1.5rem' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Total Run Copies
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {loading ? <CircularProgress size={16} /> : stats.totalQuantity.toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Customer Coverage Card */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, bgcolor: 'secondary.lighter', color: 'secondary.main', borderRadius: 3.5, display: 'flex' }}>
                  <GroupIcon sx={{ fontSize: '1.5rem' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Customer Coverage
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {loading ? <CircularProgress size={16} /> : stats.uniqueCustomers} Accounts
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Feature Layout */}
      {activeTab === 1 ? (
        <PaperIntelligenceEngine />
      ) : activeTab === 2 ? (
        <PlateWorkspace />
      ) : activeTab === 3 ? (
        <ImpressionWorkspace />
      ) : activeTab === 4 ? (
        <PrintingCostWorkspace />
      ) : activeTab === 5 ? (
        <FinishingWorkspace />
      ) : viewMode === 'list' ? (
        <EstimateList
          jobs={jobs}
          loading={loading}
          onAddEstimate={() => {
            setEditingJob(null);
            setViewMode('form');
          }}
          onEditEstimate={(job) => {
            setEditingJob(job);
            setViewMode('form');
          }}
          onDeleteEstimate={handleDeleteJob}
          onConvertToQuotation={onConvertToQuotation}
        />
      ) : (
        <EstimateForm
          initialData={editingJob}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setViewMode('list');
            setEditingJob(null);
          }}
        />
      )}

      {/* Snackbar Alert Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: '8px', fontWeight: 'bold' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
