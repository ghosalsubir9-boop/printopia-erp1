/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  Grid,
  Divider,
  Menu,
  MenuItem,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import {
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  MoreVertical as MoreIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  XCircle as CancelIcon,
  Shuffle as MoveIcon,
  Eye as ViewIcon,
  Plus as PlusIcon,
} from 'lucide-react';
import { ProductionTrackingApiService, EnrichedJobItem, STAGE_PROGRESS_MAP } from '../services/productionTrackingApi';
import { MachineMasterItem } from '../../machines/types';

interface MachineQueueBoardProps {
  onSelectJob: (job: EnrichedJobItem) => void;
  onRefreshTrigger?: () => void;
}

export default function MachineQueueBoard({ onSelectJob, onRefreshTrigger }: MachineQueueBoardProps) {
  const [jobs, setJobs] = useState<EnrichedJobItem[]>([]);
  const [machines, setMachines] = useState<MachineMasterItem[]>([]);
  const [loading, setLoading] = useState(true);

  // For Move Machine Dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedJobToMove, setSelectedJobToMove] = useState<EnrichedJobItem | null>(null);

  // Anchor for card action menus
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedJobForMenu, setSelectedJobForMenu] = useState<EnrichedJobItem | null>(null);

  // Drag and Drop state
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [loadedJobs, loadedMachines] = await Promise.all([
        ProductionTrackingApiService.getJobs(),
        ProductionTrackingApiService.getMachines()
      ]);
      setJobs(loadedJobs);
      setMachines(loadedMachines);
    } catch (err: unknown) {
      console.error("Error loading queue board:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData();
    if (onRefreshTrigger) onRefreshTrigger();
  };

  // Move up in queue
  const handleMoveUp = async (job: EnrichedJobItem) => {
    const machineJobs = jobs.filter(
      j => j.assignedMachineId === job.assignedMachineId && j.status !== 'Completed' && j.status !== 'Cancelled'
    );
    const index = machineJobs.findIndex(j => j.id === job.id);
    if (index <= 0) return; // Already at the top

    // Swap positions
    const reorderedIds = machineJobs.map(j => j.id);
    const temp = reorderedIds[index];
    reorderedIds[index] = reorderedIds[index - 1];
    reorderedIds[index - 1] = temp;

    await ProductionTrackingApiService.reorderQueue(job.assignedMachineId || '', reorderedIds);
    handleRefresh();
  };

  // Move down in queue
  const handleMoveDown = async (job: EnrichedJobItem) => {
    const machineJobs = jobs.filter(
      j => j.assignedMachineId === job.assignedMachineId && j.status !== 'Completed' && j.status !== 'Cancelled'
    );
    const index = machineJobs.findIndex(j => j.id === job.id);
    if (index === -1 || index >= machineJobs.length - 1) return; // Already at the bottom

    // Swap positions
    const reorderedIds = machineJobs.map(j => j.id);
    const temp = reorderedIds[index];
    reorderedIds[index] = reorderedIds[index + 1];
    reorderedIds[index + 1] = temp;

    await ProductionTrackingApiService.reorderQueue(job.assignedMachineId || '', reorderedIds);
    handleRefresh();
  };

  // Put on Hold
  const handlePutOnHold = async (job: EnrichedJobItem) => {
    try {
      await ProductionTrackingApiService.updateJob(
        job.id,
        { status: 'On Hold' },
        'Job was put on hold from the machine queue board.'
      );
      handleRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update job status.";
      alert(message);
    }
  };

  // Resume Job
  const handleResumeJob = async (job: EnrichedJobItem) => {
    try {
      // Find previous non-hold, non-cancelled status from timeline, or default to Planning
      const prevEvents = (job.timeline || []).slice().reverse();
      const lastActiveEvent = prevEvents.find(e => e.newStatus !== 'On Hold' && e.newStatus !== 'Cancelled');
      const targetStage = lastActiveEvent ? lastActiveEvent.newStatus : 'Planning';

      await ProductionTrackingApiService.updateJob(
        job.id,
        { status: targetStage },
        `Job resumed from Hold state. Status restored to ${targetStage}.`
      );
      handleRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resume job.";
      alert(message);
    }
  };

  // Cancel Job (Removes from active queue list based on business rule)
  const handleCancelJob = async (job: EnrichedJobItem) => {
    if (!window.confirm(`Are you sure you want to cancel the job for "${job.productName}"? This will remove it from the active queue.`)) {
      return;
    }
    try {
      await ProductionTrackingApiService.updateJob(
        job.id,
        { status: 'Cancelled' },
        'Job was cancelled and removed from active production queue.'
      );
      handleRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to cancel job.";
      alert(message);
    }
  };

  // Move job to another machine trigger
  const handleMoveMachineTrigger = (job: EnrichedJobItem) => {
    setSelectedJobToMove(job);
    setMoveDialogOpen(true);
    setMenuAnchor(null);
  };

  // Confirm moving job to machine
  const handleConfirmMoveMachine = async (machine: MachineMasterItem) => {
    if (!selectedJobToMove) return;
    try {
      await ProductionTrackingApiService.moveJobToMachine(
        selectedJobToMove.id,
        machine.id,
        machine.machineName
      );
      setMoveDialogOpen(false);
      setSelectedJobToMove(null);
      handleRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to move job.";
      alert(message);
    }
  };

  // Menu Handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, job: EnrichedJobItem) => {
    setMenuAnchor(event.currentTarget);
    setSelectedJobForMenu(job);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedJobForMenu(null);
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    setDraggingJobId(jobId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', jobId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnMachine = async (e: React.DragEvent, targetMachineId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain') || draggingJobId;
    if (!draggedId) return;

    const draggedJob = jobs.find(j => j.id === draggedId);
    if (!draggedJob) return;

    if (draggedJob.assignedMachineId === targetMachineId) {
      // Reordering inside same machine via drag and drop
      setDraggingJobId(null);
      return;
    }

    // Move to another machine
    const targetMachine = machines.find(m => m.id === targetMachineId);
    if (!targetMachine) return;

    try {
      await ProductionTrackingApiService.moveJobToMachine(
        draggedJob.id,
        targetMachine.id,
        targetMachine.machineName
      );
      handleRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to move job.";
      alert(message);
    } finally {
      setDraggingJobId(null);
    }
  };

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

  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'Planning': return 'default';
      case 'Paper Issued': return 'info';
      case 'Plate Ready': return 'secondary';
      case 'Ready for Printing': return 'primary';
      case 'Printing Started': return 'success';
      case 'Printing Completed': return 'success';
      case 'On Hold': return 'warning';
      case 'Cancelled': return 'error';
      default: return 'primary';
    }
  };

  if (loading && jobs.length === 0) {
    return (
      <Box sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2 }}>
        <CircularProgress size={40} color="warning" />
        <Typography variant="body1" color="text.secondary">Loading Machine Queues...</Typography>
      </Box>
    );
  }

  // Group unassigned active jobs
  const unassignedJobs = jobs.filter(
    j => (!j.assignedMachineId || j.assignedMachineId === 'unassigned') && j.status !== 'Completed' && j.status !== 'Cancelled'
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header Panel */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'grey.50', p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Machine-Wise Live Production Queues
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Drag and drop jobs between machines, or use click arrows to reorder priorities instantly.
          </Typography>
        </Box>
        <Button variant="outlined" color="inherit" onClick={handleRefresh} size="small">
          Refresh Board
        </Button>
      </Box>

      {/* Main Boards Scroll Row */}
      <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 2, minHeight: '650px', alignItems: 'flex-start' }}>
        
        {/* Unassigned Backlog Column */}
        {unassignedJobs.length > 0 && (
          <Box 
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropOnMachine(e, 'unassigned')}
            sx={{ 
              flex: '0 0 340px', 
              width: '340px', 
              bgcolor: 'error.50', 
              borderRadius: 3, 
              border: '2px dashed', 
              borderColor: 'error.200',
              display: 'flex', 
              flexDirection: 'column', 
              maxHeight: '750px',
              p: 2 
            }}
          >
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'error.dark' }}>
                Unassigned Backlog
              </Typography>
              <Chip label={`${unassignedJobs.length} Jobs`} size="small" color="error" />
            </Box>
            
            <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {unassignedJobs.map((job) => (
                <Card 
                  key={job.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, job.id)}
                  sx={{ 
                    borderRadius: 2, 
                    border: '1px solid', 
                    borderColor: 'error.100',
                    cursor: 'grab',
                    '&:hover': { boxShadow: '0 4px 12px 0 rgba(0,0,0,0.08)' } 
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                        {job.poNumber} | Job-{String(job.jobIndex).padStart(2, '0')}
                      </Typography>
                      <Chip label={job.priority} color={getPriorityColor(job.priority || '')} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {job.productName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                      Customer: {job.customerName} | Qty: {job.quantity.toLocaleString()}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip label="Assign Machine" size="small" color="warning" onClick={() => handleMoveMachineTrigger(job)} sx={{ fontSize: '0.7rem' }} />
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, job)}>
                        <MoreIcon size={16} />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {/* Machine Column loops */}
        {machines.map(m => {
          const machineJobs = jobs.filter(
            j => j.assignedMachineId === m.id && j.status !== 'Completed' && j.status !== 'Cancelled'
          );

          return (
            <Box 
              key={m.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnMachine(e, m.id)}
              sx={{ 
                flex: '0 0 340px', 
                width: '340px', 
                bgcolor: 'grey.50', 
                borderRadius: 3, 
                border: '1px solid', 
                borderColor: 'divider',
                display: 'flex', 
                flexDirection: 'column', 
                maxHeight: '750px',
                p: 2,
                transition: 'all 0.2s',
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              {/* Machine Column Header */}
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {m.machineName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {m.manufacturer} • {m.machineCode}
                  </Typography>
                </Box>
                <Chip label={`${machineJobs.length} Active`} size="small" color="primary" variant="outlined" />
              </Box>
              <Divider sx={{ mb: 2 }} />

              {/* Queue Items Container */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, minHeight: '150px' }}>
                {machineJobs.length > 0 ? (
                  machineJobs.map((job, idx) => (
                    <Card 
                      key={job.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, job.id)}
                      sx={{ 
                        borderRadius: 2.5, 
                        border: '1px solid', 
                        borderColor: 'grey.200',
                        cursor: 'grab',
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: '0 4px 12px 0 rgba(0,0,0,0.06)' }
                      }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        {/* Top Metadata Row */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                            Pos #{idx + 1} | {job.poNumber}
                          </Typography>
                          <Chip 
                            label={job.priority} 
                            color={getPriorityColor(job.priority || '')} 
                            size="small" 
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 'bold' }} 
                          />
                        </Box>

                        {/* Product Title */}
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 0.5 }}>
                          {job.productName}
                        </Typography>
                        
                        {/* Customer & Qty */}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          {job.customerName} • <strong>{job.quantity.toLocaleString()} pcs</strong>
                        </Typography>

                        {/* Status chip and progress indicator */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Chip 
                            label={job.status} 
                            color={getStatusChipColor(job.status || 'Planning')} 
                            size="small" 
                            sx={{ height: 20, fontSize: '0.7rem' }} 
                          />
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {STAGE_PROGRESS_MAP[job.status || 'Planning']}%
                          </Typography>
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        {/* Control actions bar inside card */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Move Up Queue">
                              <span>
                                <IconButton size="small" onClick={() => handleMoveUp(job)} disabled={idx === 0}>
                                  <ArrowUpIcon size={14} />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Move Down Queue">
                              <span>
                                <IconButton size="small" onClick={() => handleMoveDown(job)} disabled={idx === machineJobs.length - 1}>
                                  <ArrowDownIcon size={14} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Button 
                              variant="text" 
                              size="small" 
                              onClick={() => onSelectJob(job)}
                              startIcon={<ViewIcon size={12} />}
                              sx={{ py: 0, fontSize: '0.75rem', fontWeight: 'bold' }}
                            >
                              Track
                            </Button>
                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, job)}>
                              <MoreIcon size={14} />
                            </IconButton>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px', border: '1px dashed', borderColor: 'grey.300', borderRadius: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Drop jobs here to assign.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Quick Action Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {selectedJobForMenu && selectedJobForMenu.status !== 'On Hold' && (
          <MenuItem onClick={() => { handlePutOnHold(selectedJobForMenu); handleMenuClose(); }}>
            <PauseIcon size={16} style={{ marginRight: 8, color: '#f59e0b' }} /> Put Job On Hold
          </MenuItem>
        )}
        {selectedJobForMenu && selectedJobForMenu.status === 'On Hold' && (
          <MenuItem onClick={() => { handleResumeJob(selectedJobForMenu); handleMenuClose(); }}>
            <PlayIcon size={16} style={{ marginRight: 8, color: '#10b981' }} /> Resume Job
          </MenuItem>
        )}
        <MenuItem onClick={() => { if (selectedJobForMenu) handleMoveMachineTrigger(selectedJobForMenu); }}>
          <MoveIcon size={16} style={{ marginRight: 8, color: '#0284c7' }} /> Move to Another Machine
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { if (selectedJobForMenu) handleCancelJob(selectedJobForMenu); handleMenuClose(); }} sx={{ color: 'error.main' }}>
          <CancelIcon size={16} style={{ marginRight: 8, color: '#ef4444' }} /> Cancel & Remove Job
        </MenuItem>
      </Menu>

      {/* Change / Move Machine Dialog */}
      <Dialog open={moveDialogOpen} onClose={() => setMoveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Change Assigned Machine</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select the destination machine to route <strong>{selectedJobToMove?.productName}</strong>. 
            The job's completed production history and tracking timeline will be fully preserved.
          </Typography>
          <List>
            {machines
              .filter(m => m.id !== selectedJobToMove?.assignedMachineId)
              .map(m => (
                <ListItem key={m.id} disablePadding>
                  <ListItemButton
                    onClick={() => handleConfirmMoveMachine(m)}
                    sx={{ 
                      border: '1px solid', 
                      borderColor: 'grey.200', 
                      borderRadius: 2, 
                      mb: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.200' }
                    }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {m.machineName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.machineType} • Code: {m.machineCode}
                    </Typography>
                  </ListItemButton>
                </ListItem>
              ))}
            {/* Option to unassign */}
            {selectedJobToMove?.assignedMachineId !== 'unassigned' && (
              <ListItem disablePadding>
                <ListItemButton 
                  onClick={() => handleConfirmMoveMachine({ id: 'unassigned', machineName: 'Unassigned Machine' } as MachineMasterItem)}
                  sx={{ 
                    border: '1px solid', 
                    borderColor: 'error.100', 
                    borderRadius: 2, 
                    mb: 1,
                    bgcolor: 'error.50',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    '&:hover': { bgcolor: 'error.100' }
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'error.dark' }}>
                    Move to Unassigned Backlog
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Removes machine assignment
                  </Typography>
                </ListItemButton>
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveDialogOpen(false)} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
