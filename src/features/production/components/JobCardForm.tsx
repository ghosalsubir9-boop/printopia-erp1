/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Alert,
  IconButton,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  Chip
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon, AutoAwesome as AutoIcon } from '@mui/icons-material';
import { ProductionOrder, JobCard, JobCardItem, JobCardItemCreateInput, JobCardStatus, JobCardInstructionOverride } from '../types';
import { ProductionApiService } from '../services/api';
import { JobCardApiService } from '../services/jobCardApi';
import { ProductApiService } from '../../product-master/services/api';
import { CustomerMasterService } from '../../customer-master/services/mockApi';
import { PIApiService } from '../../proforma-invoice/services/api';
import { ProformaInvoice } from '../../proforma-invoice/types';
import { CustomerMasterItem } from '../../customer-master/types';

interface JobCardFormProps {
  onSave: () => void;
  onCancel: () => void;
}

export default function JobCardForm({ onSave, onCancel }: JobCardFormProps) {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [existingJobCards, setExistingJobCards] = useState<string[]>([]);
  const [selectedPO, setSelectedPO] = useState<ProductionOrder | null>(null);
  const [productCodeMap, setProductCodeMap] = useState<Record<string, string>>({});
  const [piList, setPiList] = useState<ProformaInvoice[]>([]);
  const [customerList, setCustomerList] = useState<CustomerMasterItem[]>([]);
  
  // Form fields
  const [designer, setDesigner] = useState('');
  const [artworkVersion, setArtworkVersion] = useState('v1.0');
  const [artworkNotes, setArtworkNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Per job item customized instructions
  const [itemInstructions, setItemInstructions] = useState<Record<string, JobCardInstructionOverride>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [poList, jcList, productList, piDataList, customerDataList] = await Promise.all([
        ProductionApiService.getOrders(),
        JobCardApiService.getJobCards(),
        ProductApiService.getProducts(),
        PIApiService.getInvoices(),
        CustomerMasterService.getCustomers()
      ]);
      
      // Filter for APPROVED orders (mandatory!)
      const approvedOrders = poList.filter(o => o.status === 'Approved');
      setOrders(approvedOrders);

      // Map product IDs to actual product codes
      const codeMap: Record<string, string> = {};
      productList.forEach(p => {
        codeMap[p.id] = p.productCode;
      });
      setProductCodeMap(codeMap);
      setPiList(piDataList);
      setCustomerList(customerDataList);

      // Track PO numbers that already have Job Cards
      const poIdsWithCards = jcList.map(jc => jc.poId);
      setExistingJobCards(poIdsWithCards);
    } catch (err) {
      setError('Failed to load data from storage.');
    } finally {
      setLoading(false);
    }
  };

  const handlePOChange = (poId: string) => {
    const po = orders.find(o => o.id === poId) || null;
    setSelectedPO(po);
    
    if (po) {
      // Initialize instructions overrides for each item in the selected PO
      const instructions: typeof itemInstructions = {};
      po.items.forEach(item => {
        instructions[item.id] = {
          selectedUps: item.planning?.ups || 1,
          lamination: 'Not specified',
          binding: 'Not specified',
          specialProcess: 'Not specified',
          remarks: item.planning?.factoryNotes || 'Not specified',
          fileAccessories: item.fileAccessories || 'None',
          layoutData: item.layoutData,
          printingDirection: 'Not specified',
          frontColour: 'Not specified',
          backColour: 'Not specified',
          colourSequence: 'Not specified',
          specialNotes: 'Not specified'
        };
      });
      setItemInstructions(instructions);
    }
  };

  const handleItemOverride = <K extends keyof JobCardInstructionOverride>(
    itemId: string, 
    field: K, 
    value: JobCardInstructionOverride[K]
  ) => {
    setItemInstructions(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) {
      setError('Please select an Approved Production Order to proceed.');
      return;
    }

    if (existingJobCards.includes(selectedPO.id)) {
      setError(`A Job Card already exists for Production Order ${selectedPO.poNumber}.`);
      return;
    }

    // Comprehensive validation for mandatory fields
    const missingFields: string[] = [];
    if (!selectedPO.piId || !selectedPO.piNumber) {
      missingFields.push("Linked Proforma Invoice (PI) Number");
    }
    if (!selectedPO.customerId || !selectedPO.customerName) {
      missingFields.push("Customer Information (ID or Name)");
    }
    if (!selectedPO.poNumber) {
      missingFields.push("Production Order Number");
    }
    if (!selectedPO.deliveryDate) {
      missingFields.push("Expected Delivery Date");
    }
    if (!selectedPO.salesExecutive) {
      missingFields.push("Sales Executive");
    }

    selectedPO.items.forEach((item, index) => {
      const itemNum = index + 1;
      const actualCode = productCodeMap[item.productId];
      if (!actualCode) {
        missingFields.push(`Product Master Code for Item #${itemNum} (${item.productName})`);
      }
      if (!item.productId || !item.productName) {
        missingFields.push(`Product Info (ID or Name) for Item #${itemNum}`);
      }
      if (!item.quantity || item.quantity <= 0) {
        missingFields.push(`Quantity for Item #${itemNum}`);
      }
      if (!item.paperType) {
        missingFields.push(`Paper Selection for Item #${itemNum}`);
      }
      if (!item.gsm) {
        missingFields.push(`GSM for Item #${itemNum}`);
      }
      if (!item.planning?.machineName) {
        missingFields.push(`Planning Machine for Item #${itemNum}`);
      }
      if (item.planning?.requiredParentSheets === undefined || item.planning?.requiredParentSheets === null) {
        missingFields.push(`Required Parent Sheets for Item #${itemNum}`);
      }
      if (item.planning?.plateQty === undefined || item.planning?.plateQty === null) {
        missingFields.push(`Plate Quantity for Item #${itemNum}`);
      }
    });

    if (missingFields.length > 0) {
      setError(`Cannot generate Job Card. The following mandatory production values are missing: ${missingFields.join(', ')}.`);
      return;
    }

    try {
      // Prepare job card items
      const jobCardItems: Omit<JobCardItem, 'id' | 'jobCardId'>[] = selectedPO.items.map(item => {
        const custom = itemInstructions[item.id];
        const actualProductCode = productCodeMap[item.productId] || 'Not specified';
        return {
          jobItemId: item.id,
          productId: item.productId,
          productName: item.productName,
          productCode: actualProductCode,
          specification: `${item.openSize} Open / ${item.closeSize} Close`,
          quantity: item.quantity,
          paper: item.paperType,
          gsm: item.gsm,
          sheetSize: item.planning?.parentSheet || 'Not specified',
          suggestedUps: item.planning?.ups || 1,
          selectedUps: Number(custom.selectedUps),
          printingSide: item.printingSide,
          colour: item.colour,
          machine: item.planning?.machineName || 'Not specified',
          plate: item.planning?.plateQty ? `${item.planning.plateQty} Plates` : 'Not specified',
          cutting: item.planning?.cutting || 'Not specified',
          lamination: custom.lamination || 'Not specified',
          binding: custom.binding || 'Not specified',
          fileAccessories: custom.fileAccessories || 'None',
          layoutData: custom.layoutData,
          specialProcess: custom.specialProcess || 'Not specified',
          remarks: custom.remarks || 'Not specified',
          printingDirection: custom.printingDirection || 'Not specified',
          frontColour: custom.frontColour || 'Not specified',
          backColour: custom.backColour || 'Not specified',
          colourSequence: custom.colourSequence || 'Not specified',
          specialNotes: custom.specialNotes || 'Not specified',
          status: 'Created',
          materials: {
            id: `jcm-${Date.now()}-${item.id}`,
            jobCardItemId: '',
            paperEstimated: item.planning?.requiredParentSheets || 0,
            paperActual: 0, 
            paperUnit: 'Sheets',
            plateEstimated: item.planning?.plateQty || 0,
            plateActual: 0, 
            plateUnit: 'Plates',
            inkEstimated: 0,
            inkActual: 0, 
            inkUnit: 'Kg',
            otherEstimated: 0,
            otherActual: 0,
            otherUnit: 'N/A'
          }
        };
      });

      const matchingPI = piList.find(pi => pi.id === selectedPO.piId);
      const matchingCustomer = customerList.find(c => c.id === selectedPO.customerId);

      await JobCardApiService.createJobCard({
        poId: selectedPO.id,
        poNumber: selectedPO.poNumber,
        piNo: selectedPO.piNumber || matchingPI?.piNumber || 'Not specified',
        quotationNo: matchingPI?.quotationNumber || 'Not specified',
        customerName: selectedPO.customerName,
        customerCode: matchingCustomer?.customerCode || 'Not specified',
        salesExecutive: selectedPO.salesExecutive,
        priority: selectedPO.priority,
        expectedDeliveryDate: selectedPO.deliveryDate,
        items: jobCardItems,
        artwork: {
          artworkVersion,
          artworkStatus: 'Pending',
          designer,
          artworkNotes
        }
      });

      setSuccess('Job Card generated successfully!');
      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create Job Card.';
      setError(message);
    }
  };

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={onCancel} color="primary" sx={{ border: '1px solid', borderColor: 'divider' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Generate Job Card</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Section 1: Select Approved PO */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoIcon color="primary" /> Select Approved Production Order
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Production Order</InputLabel>
                    <Select
                      value={selectedPO?.id || ''}
                      onChange={(e) => handlePOChange(e.target.value)}
                      label="Production Order"
                    >
                      <MenuItem value="" disabled>Select Production Order</MenuItem>
                      {orders.map((po) => {
                        const hasCard = existingJobCards.includes(po.id);
                        return (
                          <MenuItem key={po.id} value={po.id} disabled={hasCard}>
                            {po.poNumber} - {po.customerName} {hasCard ? ' (Job Card Already Generated)' : ''}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Grid>
                {selectedPO && (
                  <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={`Customer: ${selectedPO.customerName}`} variant="outlined" color="primary" />
                      <Chip label={`PI Ref: ${selectedPO.piNumber}`} variant="outlined" />
                      <Chip
                        label={`Priority: ${selectedPO.priority}`}
                        color={selectedPO.priority === 'Super Urgent' ? 'error' : selectedPO.priority === 'Urgent' ? 'warning' : 'primary'}
                        size="small"
                      />
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>

          {selectedPO && (
            <>
              {/* Section 2: Header Metadata & Artwork */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, borderRadius: 2, h: '100%' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Job Card Metadata</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Job Card Creation Date"
                        type="date"
                        fullWidth
                        disabled
                        value={new Date().toISOString().split('T')[0]}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Expected Delivery Date"
                        type="date"
                        fullWidth
                        disabled
                        value={selectedPO.deliveryDate}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Sales Executive"
                        fullWidth
                        disabled
                        value={selectedPO.salesExecutive}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Customer Code"
                        fullWidth
                        disabled
                        value={`CUST-${selectedPO.customerId.substring(0, 4).toUpperCase()}`}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, borderRadius: 2, h: '100%' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Initial Artwork Details</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Designer Assigned"
                        fullWidth
                        required
                        value={designer}
                        onChange={(e) => setDesigner(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Artwork Version"
                        fullWidth
                        required
                        value={artworkVersion}
                        onChange={(e) => setArtworkVersion(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label="Artwork Instructions / Notes"
                        fullWidth
                        multiline
                        rows={2}
                        value={artworkNotes}
                        onChange={(e) => setArtworkNotes(e.target.value)}
                        placeholder="E.g., high resolution PDF requested from client. Match spot color pantone."
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Section 3: Job Card Items Specific Instructions */}
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 3 }}>Job Items & Production Instructions overrides</Typography>
                  
                  {selectedPO.items.map((item, index) => {
                    const custom = itemInstructions[item.id] || {
                      selectedUps: 1,
                      lamination: '',
                      binding: '',
                      specialProcess: '',
                      remarks: '',
                      printingDirection: '',
                      frontColour: '',
                      backColour: '',
                      colourSequence: '',
                      specialNotes: ''
                    };

                    return (
                      <Card key={item.id} sx={{ mb: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                        <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            Item #{index + 1}: {item.productName}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            Qty: {item.quantity} | Paper: {item.paperType} ({item.gsm} GSM)
                          </Typography>
                        </Box>
                        
                        <CardContent sx={{ p: 3 }}>
                          <Grid container spacing={2.5}>
                            {/* Line 1: UPS & Process Specs */}
                            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                              <TextField
                                label="Suggested UPS"
                                type="number"
                                fullWidth
                                disabled
                                value={item.planning?.ups || 1}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                              <TextField
                                label="Selected UPS"
                                type="number"
                                fullWidth
                                required
                                value={custom.selectedUps}
                                onChange={(e) => handleItemOverride(item.id, 'selectedUps', Number(e.target.value))}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4, md: 4 }}>
                              <TextField
                                label="Lamination Specs"
                                fullWidth
                                value={custom.lamination}
                                onChange={(e) => handleItemOverride(item.id, 'lamination', e.target.value)}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                              <TextField
                                label="Binding Instruction"
                                fullWidth
                                value={custom.binding}
                                onChange={(e) => handleItemOverride(item.id, 'binding', e.target.value)}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                              <TextField
                                select
                                label="File Accessories"
                                fullWidth
                                value={custom.fileAccessories}
                                onChange={(e) => handleItemOverride(item.id, 'fileAccessories', e.target.value as any)}
                              >
                                <MenuItem value="None">None</MenuItem>
                                <MenuItem value="Clip">Clip</MenuItem>
                                <MenuItem value="Pocket">Pocket</MenuItem>
                                <MenuItem value="Clip + Pocket">Clip + Pocket</MenuItem>
                              </TextField>
                            </Grid>

                            {/* Line 2: Technical printing overrides */}
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                              <TextField
                                label="Printing Direction"
                                fullWidth
                                value={custom.printingDirection}
                                onChange={(e) => handleItemOverride(item.id, 'printingDirection', e.target.value)}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                              <TextField
                                label="Front Printing Color"
                                fullWidth
                                value={custom.frontColour}
                                onChange={(e) => handleItemOverride(item.id, 'frontColour', e.target.value)}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                              <TextField
                                label="Back Printing Color"
                                fullWidth
                                value={custom.backColour}
                                onChange={(e) => handleItemOverride(item.id, 'backColour', e.target.value)}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                              <TextField
                                label="Color Sequence"
                                fullWidth
                                value={custom.colourSequence}
                                onChange={(e) => handleItemOverride(item.id, 'colourSequence', e.target.value)}
                              />
                            </Grid>

                            {/* Line 3: Special processing & notes */}
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <TextField
                                label="Special Process (E.g. Foil, Spot UV)"
                                fullWidth
                                value={custom.specialProcess}
                                onChange={(e) => handleItemOverride(item.id, 'specialProcess', e.target.value)}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <TextField
                                label="Planning Remarks / overrides"
                                fullWidth
                                value={custom.remarks}
                                onChange={(e) => handleItemOverride(item.id, 'remarks', e.target.value)}
                              />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                              <TextField
                                label="Special Instructions & Quality Criteria"
                                fullWidth
                                multiline
                                rows={2}
                                value={custom.specialNotes}
                                onChange={(e) => handleItemOverride(item.id, 'specialNotes', e.target.value)}
                              />
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Paper>
              </Grid>

              {/* Submit panel */}
              <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button variant="outlined" onClick={onCancel} sx={{ px: 4, py: 1.2 }}>Cancel</Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  sx={{ px: 4, py: 1.2, fontWeight: 'bold' }}
                >
                  Generate Job Card
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      </form>
    </Box>
  );
}
