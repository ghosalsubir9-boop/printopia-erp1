/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Box, Container, CircularProgress, Alert, Tabs, Tab } from '@mui/material';
import DashboardLayout from '../../machines/components/DashboardLayout';
import ProductionOrderList from './ProductionOrderList';
import ProductionOrderForm from './ProductionOrderForm';
import PaperIssueList from './PaperIssueList';
import PaperIssueForm from './PaperIssueForm';
import PaperIssueDetails from './PaperIssueDetails';
import PlateIssueList from './PlateIssueList';
import PlateIssueForm from './PlateIssueForm';
import PlateIssueDetails from './PlateIssueDetails';
import ProductionDashboard from './ProductionDashboard';
import MachineQueueBoard from './MachineQueueBoard';
import JobProductionDetails from './JobProductionDetails';
import QCInspectionList from './QCInspectionList';
import QCInspectionForm from './QCInspectionForm';
import QCInspectionDetails from './QCInspectionDetails';
import ReworkTaskList from './ReworkTaskList';
import ReworkTaskForm from './ReworkTaskForm';
import ReworkTaskDetails from './ReworkTaskDetails';
import { ProductionOrder, PaperIssueSlip, PlateIssueSlip, QCInspection, ReworkTask, DispatchRecord, DeliveryChallan } from '../types';
import { EnrichedJobItem, ProductionTrackingApiService } from '../services/productionTrackingApi';
import { ProductionApiService } from '../services/api';
import { ProformaInvoice } from '../../proforma-invoice/types';
import DispatchList from './DispatchList';
import DispatchForm from './DispatchForm';
import DispatchDetails from './DispatchDetails';
import DeliveryChallanList from './DeliveryChallanList';
import DeliveryChallanForm from './DeliveryChallanForm';
import DeliveryChallanDetails from './DeliveryChallanDetails';

interface ProductionModuleProps {
  initialPI?: ProformaInvoice | null;
}

export default function ProductionModule({ initialPI }: ProductionModuleProps) {
  const [view, setView] = useState<
    | 'list'
    | 'create'
    | 'edit'
    | 'create_pis'
    | 'edit_pis'
    | 'details_pis'
    | 'create_pls'
    | 'edit_pls'
    | 'details_pls'
    | 'create_qc'
    | 'details_qc'
    | 'create_rwk'
    | 'details_rwk'
    | 'create_disp'
    | 'details_disp'
    | 'create_chal'
    | 'details_chal'
  >('list');
  const [tabIndex, setTabIndex] = useState(0); // 0=Dashboard, 1=Queue, 2=Orders, 3=Paper, 4=Plate, 5=QC, 6=Rework, 7=Dispatch, 8=Delivery Challan
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [currentOrder, setCurrentOrder] = useState<ProductionOrder | null>(null);
  const [currentPIS, setCurrentPIS] = useState<PaperIssueSlip | null>(null);
  const [currentPLS, setCurrentPLS] = useState<PlateIssueSlip | null>(null);
  
  // QC and Rework States
  const [currentQC, setCurrentQC] = useState<QCInspection | null>(null);
  const [currentRWK, setCurrentRework] = useState<ReworkTask | null>(null);
  const [preselectedJobForQC, setPreselectedJobForQC] = useState<EnrichedJobItem | null>(null);
  const [preselectedJobForRework, setPreselectedJobForRework] = useState<EnrichedJobItem | null>(null);

  // Dispatch and Delivery Challan States
  const [currentDisp, setCurrentDisp] = useState<DispatchRecord | null>(null);
  const [currentChal, setCurrentChal] = useState<DeliveryChallan | null>(null);
  const [preselectedJobForDisp, setPreselectedJobForDisp] = useState<EnrichedJobItem | null>(null);

  // Phase-4 Production Tracker States
  const [selectedJob, setSelectedJob] = useState<EnrichedJobItem | null>(null);

  // Preselection for generating Paper/Plate Issue directly from Job Items
  const [preselectedPOId, setPreselectedPOId] = useState<string | undefined>(undefined);
  const [preselectedJobItemId, setPreselectedJobItemId] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (initialPI) {
      handleConvertFromPI(initialPI);
    }
  }, [initialPI]);

  const handleConvertFromPI = async (pi: ProformaInvoice) => {
    // Check for existing POs
    const existingPOs = await ProductionApiService.getOrderByPiId(pi.id);
    if (existingPOs.length > 0) {
      const confirmNew = window.confirm(
        `A Production Order (${existingPOs[0].poNumber}) already exists for this PI. Do you want to create a NEW Production Order?`
      );
      if (!confirmNew) {
        setView('list');
        setTabIndex(0);
        return;
      }
    }

    setLoading(true);
    try {
      const draft = await ProductionApiService.prepareFromPI(pi);
      setCurrentOrder(draft as ProductionOrder); // It's a partial PO without ID yet
      setView('create');
    } catch (err: unknown) {
      setError('Failed to prepare Production Order from PI');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await ProductionApiService.getOrders();
      setOrders(data);
      setError(null);
    } catch (err: unknown) {
      setError('Failed to load production orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSelectedJob = async () => {
    await loadOrders();
    if (selectedJob) {
      try {
        const allJobs = await ProductionTrackingApiService.getJobs();
        const updatedJob = allJobs.find(j => j.id === selectedJob.id);
        if (updatedJob) {
          setSelectedJob(updatedJob);
        }
      } catch (err: unknown) {
        console.error("Error refreshing selected job:", err);
      }
    }
  };

  const handleAdd = () => {
    setCurrentOrder(null);
    setView('create');
  };

  const handleEdit = (order: ProductionOrder) => {
    setCurrentOrder(order);
    setView('edit');
  };

  const handleSave = () => {
    loadOrders();
    setView('list');
    setTabIndex(2);
  };

  const handleCancel = () => {
    setView('list');
  };

  // Paper Issue Slip Handlers
  const handleGeneratePaperIssue = (poId: string, jobId: string) => {
    setPreselectedPOId(poId);
    setPreselectedJobItemId(jobId);
    setCurrentPIS(null);
    setView('create_pis');
  };

  const handleAddPIS = () => {
    setPreselectedPOId(undefined);
    setPreselectedJobItemId(undefined);
    setCurrentPIS(null);
    setView('create_pis');
  };

  const handleEditPIS = (slip: PaperIssueSlip) => {
    setCurrentPIS(slip);
    setView('edit_pis');
  };

  const handleViewPIS = (slip: PaperIssueSlip) => {
    setCurrentPIS(slip);
    setView('details_pis');
  };

  const handlePrintPIS = (slip: PaperIssueSlip) => {
    setCurrentPIS(slip);
    setView('details_pis');
  };

  const handleSavePIS = () => {
    setPreselectedPOId(undefined);
    setPreselectedJobItemId(undefined);
    setView('list');
    setTabIndex(3); // Auto switch to Paper Issue Slips tab
  };

  const handleCancelPIS = () => {
    setPreselectedPOId(undefined);
    setPreselectedJobItemId(undefined);
    setView('list');
    setTabIndex(3);
  };

  // Plate Issue Slip Handlers
  const handleGeneratePlateIssue = (poId: string, jobId: string) => {
    setPreselectedPOId(poId);
    setPreselectedJobItemId(jobId);
    setCurrentPLS(null);
    setView('create_pls');
  };

  const handleAddPLS = () => {
    setPreselectedPOId(undefined);
    setPreselectedJobItemId(undefined);
    setCurrentPLS(null);
    setView('create_pls');
  };

  const handleEditPLS = (slip: PlateIssueSlip) => {
    setCurrentPLS(slip);
    setView('edit_pls');
  };

  const handleViewPLS = (slip: PlateIssueSlip) => {
    setCurrentPLS(slip);
    setView('details_pls');
  };

  const handlePrintPLS = (slip: PlateIssueSlip) => {
    setCurrentPLS(slip);
    setView('details_pls');
  };

  const handleSavePLS = () => {
    setPreselectedPOId(undefined);
    setPreselectedJobItemId(undefined);
    setView('list');
    setTabIndex(4); // Auto switch to Plate Issue Slips tab
  };

  const handleCancelPLS = () => {
    setPreselectedPOId(undefined);
    setPreselectedJobItemId(undefined);
    setView('list');
    setTabIndex(4);
  };

  return (
    <DashboardLayout activeModule="production">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {loading && view === 'list' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            {selectedJob ? (
              /* Chronological Job Tracker & Action Deck Details Page */
              <JobProductionDetails 
                job={selectedJob} 
                onBack={() => { setSelectedJob(null); loadOrders(); }} 
                onUpdateSuccess={handleRefreshSelectedJob}
                onStartQC={(job) => {
                  setPreselectedJobForQC(job);
                  setSelectedJob(null);
                  setView('create_qc');
                }}
                onCreateRework={(job) => {
                  setPreselectedJobForRework(job);
                  setSelectedJob(null);
                  setView('create_rwk');
                }}
                onCreateDispatch={(job) => {
                  setPreselectedJobForDisp(job);
                  setSelectedJob(null);
                  setView('create_disp');
                }}
                onGenerateChallan={() => {
                  setSelectedJob(null);
                  setView('create_chal');
                }}
              />
            ) : (
              <>
                {/* Tab navigation at lists level */}
                {view === 'list' && (
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs
                      value={tabIndex}
                      onChange={(e, val) => setTabIndex(val)}
                      textColor="primary"
                      indicatorColor="primary"
                    >
                      <Tab label="Production Dashboard" sx={{ fontWeight: 'bold' }} />
                      <Tab label="Machine Queue Board" sx={{ fontWeight: 'bold' }} />
                      <Tab label="Production Orders" sx={{ fontWeight: 'bold' }} />
                      <Tab label="Paper Issue Slips" sx={{ fontWeight: 'bold' }} />
                      <Tab label="Plate Issue Slips" sx={{ fontWeight: 'bold' }} />
                      <Tab label="QC Inspections" sx={{ fontWeight: 'bold' }} />
                      <Tab label="Rework Tasks" sx={{ fontWeight: 'bold' }} />
                      <Tab label="Dispatch" sx={{ fontWeight: 'bold' }} />
                      <Tab label="Delivery Challan" sx={{ fontWeight: 'bold' }} />
                    </Tabs>
                  </Box>
                )}

                {/* List & Tracker Views */}
                {view === 'list' && tabIndex === 0 && (
                  <ProductionDashboard 
                    onSelectJob={(job) => setSelectedJob(job)} 
                    onSwitchTab={(index) => setTabIndex(index)} 
                  />
                )}

                {view === 'list' && tabIndex === 1 && (
                  <MachineQueueBoard onSelectJob={(job) => setSelectedJob(job)} />
                )}

                {view === 'list' && tabIndex === 2 && (
                  <ProductionOrderList
                    orders={orders}
                    onAdd={handleAdd}
                    onEdit={handleEdit}
                    onView={handleEdit}
                    onStatusChange={() => {}}
                  />
                )}

                {view === 'list' && tabIndex === 3 && (
                  <PaperIssueList
                    onAdd={handleAddPIS}
                    onEdit={handleEditPIS}
                    onView={handleViewPIS}
                    onPrint={handlePrintPIS}
                  />
                )}

                {view === 'list' && tabIndex === 4 && (
                  <PlateIssueList
                    onAdd={handleAddPLS}
                    onEdit={handleEditPLS}
                    onView={handleViewPLS}
                    onPrint={handlePrintPLS}
                  />
                )}

                {view === 'list' && tabIndex === 5 && (
                  <QCInspectionList
                    onAdd={() => {
                      setPreselectedJobForQC(null);
                      setView('create_qc');
                    }}
                    onView={(inspection) => {
                      setCurrentQC(inspection);
                      setView('details_qc');
                    }}
                    onPrint={(inspection) => {
                      setCurrentQC(inspection);
                      setView('details_qc');
                    }}
                  />
                )}

                {view === 'list' && tabIndex === 6 && (
                  <ReworkTaskList
                    onAdd={() => {
                      setPreselectedJobForRework(null);
                      setView('create_rwk');
                    }}
                    onView={(task) => {
                      setCurrentRework(task);
                      setView('details_rwk');
                    }}
                  />
                )}

                {view === 'list' && tabIndex === 7 && (
                  <DispatchList
                    onAdd={() => {
                      setPreselectedJobForDisp(null);
                      setView('create_disp');
                    }}
                    onView={(record) => {
                      setCurrentDisp(record);
                      setView('details_disp');
                    }}
                  />
                )}

                {view === 'list' && tabIndex === 8 && (
                  <DeliveryChallanList
                    onAdd={() => {
                      setView('create_chal');
                    }}
                    onView={(challan) => {
                      setCurrentChal(challan);
                      setView('details_chal');
                    }}
                  />
                )}

                {/* Production Order Form Views */}
                {(view === 'create' || view === 'edit') && (
                  <ProductionOrderForm
                    initialData={currentOrder}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    onGeneratePaperIssue={handleGeneratePaperIssue}
                    onGeneratePlateIssue={handleGeneratePlateIssue}
                  />
                )}

                {/* Paper Issue Slip Form Views */}
                {(view === 'create_pis' || view === 'edit_pis') && (
                  <PaperIssueForm
                    initialData={currentPIS}
                    preselectedPOId={preselectedPOId}
                    preselectedJobItemId={preselectedJobItemId}
                    onSave={handleSavePIS}
                    onCancel={handleCancelPIS}
                  />
                )}

                {/* Paper Issue Slip Detail View */}
                {view === 'details_pis' && currentPIS && (
                  <PaperIssueDetails
                    slip={currentPIS}
                    onBack={() => {
                      setView('list');
                      setTabIndex(3);
                    }}
                    onEdit={handleEditPIS}
                  />
                )}

                {/* Plate Issue Slip Form Views */}
                {(view === 'create_pls' || view === 'edit_pls') && (
                  <PlateIssueForm
                    initialData={currentPLS}
                    preselectedPOId={preselectedPOId}
                    preselectedJobItemId={preselectedJobItemId}
                    onSave={handleSavePLS}
                    onCancel={handleCancelPLS}
                  />
                )}

                {/* Plate Issue Slip Detail View */}
                {view === 'details_pls' && currentPLS && (
                  <PlateIssueDetails
                    slip={currentPLS}
                    onBack={() => {
                      setView('list');
                      setTabIndex(4);
                    }}
                    onEdit={handleEditPLS}
                  />
                )}

                {/* QC Inspection Form View */}
                {view === 'create_qc' && (
                  <QCInspectionForm
                    preselectedJob={preselectedJobForQC}
                    onSave={() => {
                      setPreselectedJobForQC(null);
                      setView('list');
                      setTabIndex(5);
                      loadOrders();
                    }}
                    onCancel={() => {
                      setPreselectedJobForQC(null);
                      setView('list');
                      setTabIndex(5);
                    }}
                  />
                )}

                {/* QC Inspection Details View */}
                {view === 'details_qc' && currentQC && (
                  <QCInspectionDetails
                    inspection={currentQC}
                    onBack={() => {
                      setCurrentQC(null);
                      setView('list');
                      setTabIndex(5);
                    }}
                  />
                )}

                {/* Rework Task Form View */}
                {view === 'create_rwk' && (
                  <ReworkTaskForm
                    preselectedJob={preselectedJobForRework}
                    onSave={() => {
                      setPreselectedJobForRework(null);
                      setView('list');
                      setTabIndex(6);
                      loadOrders();
                    }}
                    onCancel={() => {
                      setPreselectedJobForRework(null);
                      setView('list');
                      setTabIndex(6);
                    }}
                  />
                )}

                {/* Rework Task Details View */}
                {view === 'details_rwk' && currentRWK && (
                  <ReworkTaskDetails
                    task={currentRWK}
                    onBack={() => {
                      setCurrentRework(null);
                      setView('list');
                      setTabIndex(6);
                    }}
                    onSave={() => {
                      setCurrentRework(null);
                      setView('list');
                      setTabIndex(6);
                      loadOrders();
                    }}
                  />
                )}

                {/* Dispatch Form View */}
                {view === 'create_disp' && (
                  <DispatchForm
                    preselectedJob={preselectedJobForDisp}
                    onSave={() => {
                      setPreselectedJobForDisp(null);
                      setView('list');
                      setTabIndex(7);
                      loadOrders();
                    }}
                    onCancel={() => {
                      setPreselectedJobForDisp(null);
                      setView('list');
                      setTabIndex(7);
                    }}
                  />
                )}

                {/* Dispatch Details View */}
                {view === 'details_disp' && currentDisp && (
                  <DispatchDetails
                    record={currentDisp}
                    onBack={() => {
                      setCurrentDisp(null);
                      setView('list');
                      setTabIndex(7);
                    }}
                  />
                )}

                {/* Delivery Challan Form View */}
                {view === 'create_chal' && (
                  <DeliveryChallanForm
                    onSave={() => {
                      setView('list');
                      setTabIndex(8);
                      loadOrders();
                    }}
                    onCancel={() => {
                      setView('list');
                      setTabIndex(8);
                    }}
                  />
                )}

                {/* Delivery Challan Details View */}
                {view === 'details_chal' && currentChal && (
                  <DeliveryChallanDetails
                    challan={currentChal}
                    onBack={() => {
                      setCurrentChal(null);
                      setView('list');
                      setTabIndex(8);
                    }}
                    onSave={() => {
                      loadOrders();
                    }}
                  />
                )}
              </>
            )}
          </>
        )}
      </Container>
    </DashboardLayout>
  );
}
