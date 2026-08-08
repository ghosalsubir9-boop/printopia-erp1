/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Button,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Layers as LayersIcon,
  Play as PlayIcon,
  CheckCircle as CheckIcon,
  AlertTriangle as WarningIcon,
  Clock as ClockIcon,
  TrendingUp as TrendIcon,
  Activity as ActivityIcon,
  ArrowRight as ArrowRightIcon,
  ChevronRight as ChevronRightIcon,
  Pause as PauseIcon,
} from 'lucide-react';
import { ProductionTrackingApiService, EnrichedJobItem, STAGE_PROGRESS_MAP } from '../services/productionTrackingApi';
import { MachineMasterItem } from '../../machines/types';

interface ProductionDashboardProps {
  onSelectJob: (job: EnrichedJobItem) => void;
  onSwitchTab: (tabIndex: number) => void;
}

export default function ProductionDashboard({ onSelectJob, onSwitchTab }: ProductionDashboardProps) {
  const [jobs, setJobs] = useState<EnrichedJobItem[]>([]);
  const [machines, setMachines] = useState<MachineMasterItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [loadedJobs, loadedMachines] = await Promise.all([
          ProductionTrackingApiService.getJobs(),
          ProductionTrackingApiService.getMachines()
        ]);
        setJobs(loadedJobs);
        setMachines(loadedMachines);
      } catch (e) {
        console.error("Error loading dashboard data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">Loading Production Dashboard...</Typography>
      </Box>
    );
  }

  // Calculate statistics
  const activeJobs = jobs.filter(j => j.status !== 'Completed' && j.status !== 'Cancelled');
  const completedJobsCount = jobs.filter(j => j.status === 'Completed').length;
  const onHoldJobs = jobs.filter(j => j.status === 'On Hold');
  
  const printingJobs = activeJobs.filter(j => 
    ['Printing Started', 'Printing Completed', 'Drying'].includes(j.status || '')
  );
  const finishingJobs = activeJobs.filter(j => 
    ['Cutting', 'Finishing', 'Packing', 'QC'].includes(j.status || '')
  );
  const planningJobs = activeJobs.filter(j => 
    ['Planning', 'Paper Issued', 'Plate Ready', 'Ready for Printing'].includes(j.status || '')
  );

  const urgentJobs = activeJobs.filter(j => j.priority === 'Urgent' || j.priority === 'Super Urgent')
    .sort((a, b) => {
      if (a.priority === 'Super Urgent' && b.priority !== 'Super Urgent') return -1;
      if (a.priority !== 'Super Urgent' && b.priority === 'Super Urgent') return 1;
      return a.deliveryDate.localeCompare(b.deliveryDate);
    });

  // Calculate bottlenecks
  // Bottleneck: Job is in Ready for Printing but might lack paper or plates
  const paperAndPlateStatus = jobs.map(j => {
    const paperRequired = j.planning.requiredParentSheets;
    const platesRequired = j.planning.plateQty;
    return {
      jobId: j.id,
      poNumber: j.poNumber,
      productName: j.productName,
      status: j.status,
      assignedMachineName: j.assignedMachineName,
      paperRequired,
      platesRequired
    };
  });

  // Pipeline summary counts
  const stageCounts: Record<string, number> = {
    'Planning': 0,
    'Paper Issued': 0,
    'Plate Ready': 0,
    'Ready for Printing': 0,
    'Printing Started': 0,
    'Printing Completed': 0,
    'Drying': 0,
    'Cutting': 0,
    'Finishing': 0,
    'Packing': 0,
    'QC': 0,
    'Ready for Dispatch': 0,
    'Completed': 0,
    'On Hold': 0,
    'Cancelled': 0,
  };

  jobs.forEach(j => {
    const st = j.status || 'Planning';
    if (stageCounts[st] !== undefined) {
      stageCounts[st]++;
    }
  });

  const pipelineStages = [
    { label: 'Planning', count: stageCounts['Planning'], color: 'grey.500' },
    { label: 'Paper Issued', count: stageCounts['Paper Issued'], color: 'info.main' },
    { label: 'Plate Ready', count: stageCounts['Plate Ready'], color: 'secondary.main' },
    { label: 'Ready to Print', count: stageCounts['Ready for Printing'], color: 'primary.light' },
    { label: 'Printing', count: stageCounts['Printing Started'], color: 'primary.main' },
    { label: 'Finishing & QC', count: stageCounts['Cutting'] + stageCounts['Finishing'] + stageCounts['Packing'] + stageCounts['QC'], color: 'warning.main' },
    { label: 'Dispatch Ready', count: stageCounts['Ready for Dispatch'], color: 'success.light' },
    { label: 'Completed', count: stageCounts['Completed'], color: 'success.main' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Super Urgent':
        return 'error';
      case 'Urgent':
        return 'warning';
      default:
        return 'primary';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Header and overview */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ActivityIcon size={24} style={{ color: '#d97706' }} /> Production Tracking Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time shop floor metrics, bottleneck analyzer, and active workflow tracking.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button 
            variant="contained" 
            color="primary" 
            endIcon={<ChevronRightIcon size={16} />}
            onClick={() => onSwitchTab(1)}
          >
            Manage Machine Queue Board
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 4px 12px 0 rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: 'primary.50', color: 'primary.main', borderRadius: 2 }}>
                <LayersIcon size={24} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>Active Jobs</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{activeJobs.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 4px 12px 0 rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: 'warning.50', color: 'warning.main', borderRadius: 2 }}>
                <PlayIcon size={24} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>In Printing</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{printingJobs.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 4px 12px 0 rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: 'secondary.50', color: 'secondary.main', borderRadius: 2 }}>
                <TrendIcon size={24} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>Finishing & QC</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{finishingJobs.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 4px 12px 0 rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: 'error.50', color: 'error.main', borderRadius: 2 }}>
                <PauseIcon size={24} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>Jobs On Hold</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{onHoldJobs.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Production Pipeline Overview */}
      <Card sx={{ borderRadius: 3, p: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendIcon size={18} /> Step-wise Production Pipeline
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'space-between', alignItems: 'center' }}>
          {pipelineStages.map((st, i) => (
            <React.Fragment key={st.label}>
              <Box sx={{ 
                flex: '1 1 120px', 
                minWidth: '100px', 
                textAlign: 'center', 
                p: 2, 
                bgcolor: 'grey.50', 
                border: '1px solid', 
                borderColor: 'grey.100', 
                borderRadius: 2,
                transition: 'all 0.2s',
                '&:hover': { bgcolor: 'grey.100', transform: 'translateY(-2px)' }
              }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: st.color }}>
                  {st.count}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontWeight: 'medium' }}>
                  {st.label}
                </Typography>
              </Box>
              {i < pipelineStages.length - 1 && (
                <Box className="hidden md:block" sx={{ color: 'grey.300' }}>
                  <ArrowRightIcon size={18} />
                </Box>
              )}
            </React.Fragment>
          ))}
        </Box>
      </Card>

      {/* Main split: Machine Utilization & Bottleneck Warnings */}
      <Grid container spacing={3.5}>
        {/* Machine utilization */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ borderRadius: 3, height: '100%', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Box sx={{ p: 2.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                <ActivityIcon size={18} style={{ color: '#0284c7' }} /> Machine Utilization & Queues
              </Typography>
              <Chip label={`${machines.length} Active Machines`} size="small" variant="outlined" />
            </Box>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                {machines.map(m => {
                  const machineJobs = jobs.filter(j => j.assignedMachineId === m.id && j.status !== 'Completed' && j.status !== 'Cancelled');
                  const currentActiveJob = machineJobs[0]; // First item is actively running / next
                  
                  return (
                    <Box key={m.id} sx={{ p: 2, border: '1px solid', borderColor: 'grey.100', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {m.machineName} ({m.machineCode})
                        </Typography>
                        <Chip 
                          label={machineJobs.length > 0 ? `${machineJobs.length} Job(s) in Queue` : 'Idle'} 
                          color={machineJobs.length > 0 ? 'primary' : 'default'} 
                          size="small" 
                        />
                      </Box>
                      {currentActiveJob ? (
                        <Box sx={{ bgcolor: 'primary.50', p: 1.5, borderRadius: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              <strong>Active:</strong> {currentActiveJob.productName}
                            </Typography>
                            <Chip 
                              label={currentActiveJob.status} 
                              size="small" 
                              color="primary" 
                              variant="outlined" 
                              sx={{ fontSize: '0.75rem', height: 20 }} 
                            />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Customer: {currentActiveJob.customerName} | Qty: {currentActiveJob.quantity.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              {STAGE_PROGRESS_MAP[currentActiveJob.status || 'Planning']}% Completed
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={STAGE_PROGRESS_MAP[currentActiveJob.status || 'Planning']} 
                            sx={{ height: 6, borderRadius: 3, mt: 0.5 }} 
                          />
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 1 }}>
                          No active jobs. Machine is currently idle.
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Bottleneck alert panel */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ borderRadius: 3, height: '100%', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Box sx={{ p: 2.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon size={18} style={{ color: '#ef4444' }} /> Bottleneck Warning Center
              </Typography>
            </Box>
            <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Core Check: Planning or Ready jobs lacking Paper or Plates */}
              {activeJobs.map(job => {
                const isReadyOrPlanning = ['Planning', 'Paper Issued', 'Plate Ready', 'Ready for Printing'].includes(job.status || '');
                if (!isReadyOrPlanning) return null;

                const isMissingMachine = !job.assignedMachineId || job.assignedMachineId === 'unassigned';
                const isReadyToPrintButMissingInfo = job.status === 'Ready for Printing';

                // We can show advice alerts
                if (isMissingMachine) {
                  return (
                    <Alert severity="warning" key={job.id} sx={{ borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        <strong>{job.productName}</strong> is in Planning stage but has no active machine assigned. Assign a machine in the Queue Board.
                      </Typography>
                      <Button size="small" variant="text" sx={{ mt: 0.5, p: 0 }} onClick={() => onSelectJob(job)}>
                        Open Job Tracker
                      </Button>
                    </Alert>
                  );
                }

                return null;
              })}

              {/* General active overview tips */}
              <Box sx={{ p: 2, bgcolor: 'info.50', borderRadius: 2, border: '1px solid', borderColor: 'info.100' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'info.dark', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ClockIcon size={16} /> Operational Rules Remembered
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.825rem', color: '#1e3a8a' }}>
                  <li>Paper and Plate Slips must be fully authorized and issued before printing starts.</li>
                  <li>Jobs on the queue board can be reordered to respond to urgent requests.</li>
                  <li>Move jobs between machines seamlessly to balance load.</li>
                </ul>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Urgent Jobs Section */}
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Box sx={{ p: 2.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon size={18} style={{ color: '#ea580c' }} /> High-Priority & Urgent Production Queue
          </Typography>
          <Chip label={`${urgentJobs.length} Urgent Jobs`} color="warning" size="small" />
        </Box>
        <TableContainer component={Box}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>PO / Job No</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Machine</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Delivery Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Stage</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Progress</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {urgentJobs.length > 0 ? (
                urgentJobs.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{job.poNumber}</Typography>
                      <Typography variant="caption" color="text.secondary">Job-{String(job.jobIndex).padStart(2, '0')}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'medium' }}>{job.productName}</TableCell>
                    <TableCell>{job.customerName}</TableCell>
                    <TableCell>{job.quantity.toLocaleString()}</TableCell>
                    <TableCell>{job.assignedMachineName}</TableCell>
                    <TableCell>
                      <Chip 
                        label={job.priority} 
                        color={getPriorityColor(job.priority || '')} 
                        size="small" 
                        sx={{ fontSize: '0.75rem', fontWeight: 'bold' }} 
                      />
                    </TableCell>
                    <TableCell>{job.deliveryDate}</TableCell>
                    <TableCell>
                      <Chip label={job.status} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ width: 120 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={STAGE_PROGRESS_MAP[job.status || 'Planning']} 
                            sx={{ height: 4, borderRadius: 2 }} 
                          />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          {STAGE_PROGRESS_MAP[job.status || 'Planning']}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => onSelectJob(job)}
                      >
                        Track
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    No urgent or high-priority jobs in active production.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
