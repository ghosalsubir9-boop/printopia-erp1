import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  Grid,
  TextField,
  MenuItem,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper as MuiPaper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  CloudDownload as ImportIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Info as InfoIcon,
  AddCircleOutlined as CreateIcon
} from '@mui/icons-material';
import { format, addDays } from 'date-fns';
import { QuotationHeader, QuotationItem, QuotationItemOption, QuotationTerm } from '../types';
import { QuotationApiService } from '../services/api';
import { CustomerMasterService } from '../../customer-master/services/mockApi';
import { CustomerMasterItem } from '../../customer-master/types';
import CustomerQuickCreateModal from '../../../components/CustomerQuickCreateModal';
import { ProductApiService } from '../../product-master/services/api';
import { ProductMasterItem, ProductCategory } from '../../product-master/types';
import ProductQuickCreateModal from '../../../components/ProductQuickCreateModal';
import { PaperApiService } from '../../paper-master/services/api';
import { PaperCategory, PaperGSM } from '../../paper-master/types';

interface QuotationFormProps {
  initialData?: QuotationHeader | null;
  onSave: () => void;
  onCancel: () => void;
  onModuleChange?: (module: any) => void;
  importEstimateData?: any; // To support importing from Estimate List
}

export default function QuotationForm({ initialData, onSave, onCancel, onModuleChange, importEstimateData }: QuotationFormProps) {
  const [customers, setCustomers] = useState<CustomerMasterItem[]>([]);
  const [products, setProducts] = useState<ProductMasterItem[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [paperCategories, setPaperCategories] = useState<PaperCategory[]>([]);
  const [gsmOptions, setGsmOptions] = useState<PaperGSM[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [formData, setFormData] = useState<Partial<QuotationHeader>>({
    quotationNumber: initialData?.quotationNumber || QuotationApiService.generateQuotationNumber(),
    date: initialData?.date || new Date().toISOString().split('T')[0],
    validUntil: initialData?.validUntil || format(addDays(new Date(), 15), 'yyyy-MM-dd'),
    status: initialData?.status || 'Draft',
    currentRevision: initialData?.currentRevision || 0,
    items: initialData?.items || [],
    terms: initialData?.terms || [
      { id: '1', title: 'Validity', content: 'This quotation is valid for 15 days from the date of issue.' },
      { id: '2', title: 'GST', content: 'GST @ 18% will be extra as applicable.' },
      { id: '3', title: 'Delivery', content: '7-10 working days from the date of artwork approval.' },
      { id: '4', title: 'Payment', content: '50% advance, balance against delivery.' }
    ],
    revisions: initialData?.revisions || []
  });

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [productQuickCreateOpen, setProductQuickCreateOpen] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  useEffect(() => {
    loadCustomers();
    loadProducts();
    loadCategories();
    loadPaperSpecs();
  }, []);

  const loadCustomers = async () => {
    const data = await CustomerMasterService.getCustomers();
    setCustomers(data);
  };

  const loadPaperSpecs = async () => {
    try {
      const [pcats, gsms] = await Promise.all([
        PaperApiService.getCategories(),
        PaperApiService.getGSMs()
      ]);
      setPaperCategories(pcats);
      setGsmOptions(gsms);
    } catch (error) {
      console.error('Failed to load paper specs', error);
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await ProductApiService.getProducts({ status: 'Active' });
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await ProductApiService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories', error);
    }
  };

  const handleQuickCreateSuccess = (customer: CustomerMasterItem) => {
    setCustomers(prev => [...prev, customer]);
    handleHeaderChange('customerId', customer.id);
  };

  const handleProductQuickCreateSuccess = (product: ProductMasterItem) => {
    setProducts(prev => [...prev, product]);
    if (activeItemIndex !== null) {
      const newItems = [...(formData.items || [])];
      const index = activeItemIndex;
      newItems[index].productName = product.productName;
      newItems[index].productDescription = product.description;
      newItems[index].finishedSize = `${product.sizes.finishedWidth}x${product.sizes.finishedHeight} in`;
      
      if (newItems[index].options.length === 0) {
        const defaultOption: QuotationItemOption = {
          id: Math.random().toString(36).substr(2, 9),
          itemId: newItems[index].id,
          quantity: 1000,
          rate: 0,
          total: 0,
          gstRate: product.defaultGstRate || 18,
          hsnCode: product.hsnCode,
          status: 'Pending',
          paperType: product.paperOptions.paperTypes[0] || '',
          gsm: product.paperOptions.gsms[0] || 0,
          colors: product.printOptions.colors,
          printingSide: product.printOptions.side === 'Both Side' ? 'Both Side' : 'Single Side'
        };
        newItems[index].options = [defaultOption];
      }
      setFormData(prev => ({ ...prev, items: newItems }));
      setActiveItemIndex(null);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  const handleHeaderChange = (field: keyof QuotationHeader, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-fill customer details
    if (field === 'customerId') {
      const cust = customers.find(c => c.id === value);
      if (cust) {
        setFormData(prev => ({
          ...prev,
          customerName: cust.companyName,
          billingAddress: cust.billingAddress,
          gstin: cust.gstin,
          mobile: cust.mobile,
          email: cust.email,
          contactPerson: cust.contactPerson
        }));
      }
    }
  };

  const addProduct = () => {
    const newItem: QuotationItem = {
      id: Math.random().toString(36).substr(2, 9),
      quotationId: formData.id || '',
      productName: '',
      productDescription: '',
      options: []
    };
    setFormData(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
  };

  const removeProduct = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).filter(i => i.id !== productId)
    }));
  };

  const addOption = (productId: string, defaultData?: Partial<QuotationItemOption>) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).map(item => {
        if (item.id === productId) {
          const newOption: QuotationItemOption = {
            id: Math.random().toString(36).substr(2, 9),
            itemId: productId,
            quantity: defaultData?.quantity || 1000,
            rate: defaultData?.rate || 0,
            total: defaultData?.total || 0,
            gstRate: defaultData?.gstRate || 18,
            status: 'Pending',
            gsm: defaultData?.gsm,
            paperType: defaultData?.paperType,
            colors: defaultData?.colors || '4 Colour',
            printingSide: defaultData?.printingSide || 'Single Side',
            ...defaultData
          };
          return { ...item, options: [...item.options, newOption] };
        }
        return item;
      })
    }));
  };

  const updateOption = (productId: string, optionId: string, field: keyof QuotationItemOption, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).map(item => {
        if (item.id === productId) {
          return {
            ...item,
            options: item.options.map(opt => {
              if (opt.id === optionId) {
                const updated = { ...opt, [field]: value };
                if (field === 'quantity' || field === 'rate') {
                  updated.total = Number((updated.quantity * updated.rate).toFixed(2));
                }
                return updated;
              }
              return opt;
            })
          };
        }
        return item;
      })
    }));
  };

  const removeOption = (productId: string, optionId: string) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).map(item => {
        if (item.id === productId) {
          return { ...item, options: item.options.filter(o => o.id !== optionId) };
        }
        return item;
      })
    }));
  };

  const validateQuotation = (): { valid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const items = formData.items || [];

    if (!formData.customerId) errors.push('Please select a customer.');
    if (items.length === 0) errors.push('Add at least one product.');

    items.forEach((item, itemIdx) => {
      const pName = item.productName || `Product #${itemIdx + 1}`;
      if (!item.productName) errors.push(`${pName} is missing a product selection.`);
      if (item.options.length === 0) errors.push(`${pName} must have at least one pricing option.`);

      const optionKeys = new Set<string>();
      item.options.forEach((opt, optIdx) => {
        const optLabel = `${pName} Option #${optIdx + 1}`;
        if (!opt.paperType) errors.push(`${optLabel}: Paper Type is required.`);
        if (!opt.gsm) errors.push(`${optLabel}: GSM is required.`);
        if (!opt.printingSide) errors.push(`${optLabel}: Printing Side is required.`);
        if (opt.quantity <= 0) errors.push(`${optLabel}: Quantity must be greater than zero.`);
        if (opt.rate <= 0) errors.push(`${optLabel}: Rate must be greater than zero.`);

        // Duplicate Check (GSM, Quantity, Printing Side)
        const key = `${opt.gsm}-${opt.quantity}-${opt.printingSide}`;
        if (optionKeys.has(key)) {
          warnings.push(`Duplicate option found in ${pName}: same GSM, Quantity, and Printing Side.`);
        }
        optionKeys.add(key);
      });
    });

    return { valid: errors.length === 0, errors, warnings };
  };

  const handleSave = async () => {
    const { valid, errors, warnings } = validateQuotation();
    
    if (!valid) {
      alert(`Please fix the following errors:\n\n- ${errors.join('\n- ')}`);
      return;
    }

    if (warnings.length > 0) {
      const proceed = window.confirm(`Warnings:\n\n- ${warnings.join('\n- ')}\n\nDo you still want to save?`);
      if (!proceed) return;
    }
    
    const finalData: QuotationHeader = {
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      quotationNumber: formData.quotationNumber!,
      currentRevision: formData.currentRevision!,
      date: formData.date!,
      validUntil: formData.validUntil!,
      customerId: formData.customerId!,
      customerName: formData.customerName!,
      contactPerson: formData.contactPerson,
      billingAddress: formData.billingAddress,
      gstin: formData.gstin,
      mobile: formData.mobile,
      email: formData.email,
      salesExecutive: formData.salesExecutive,
      referenceNumber: formData.referenceNumber,
      subject: formData.subject,
      remarks: formData.remarks,
      status: formData.status as any,
      items: formData.items as any,
      terms: formData.terms as any,
      revisions: formData.revisions as any,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await QuotationApiService.saveQuotation(finalData);
    onSave();
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={onCancel}>
          <BackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {initialData ? `Edit Quotation: ${initialData.quotationNumber}` : 'Create New Quotation'}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" color="inherit" onClick={onCancel} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} sx={{ borderRadius: 2, px: 4 }}>
          Save Quotation
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Header Section */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              Quotation Details
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  label="Quotation Number"
                  value={formData.quotationNumber}
                  disabled
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date"
                  value={formData.date}
                  onChange={(e) => handleHeaderChange('date', e.target.value)}
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Valid Until"
                  value={formData.validUntil}
                  onChange={(e) => handleHeaderChange('validUntil', e.target.value)}
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  label="Customer *"
                  value={formData.customerId || ''}
                  onChange={(e) => {
                    if (e.target.value === 'NEW') {
                      setQuickCreateOpen(true);
                      return;
                    }
                    handleHeaderChange('customerId', e.target.value);
                  }}
                  size="small"
                >
                  <MenuItem value="">-- Select Customer --</MenuItem>
                  <MenuItem value="NEW" sx={{ fontWeight: 'bold', color: 'primary.main' }}>+ New Customer</MenuItem>
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.companyName}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Subject"
                  value={formData.subject || ''}
                  onChange={(e) => handleHeaderChange('subject', e.target.value)}
                  size="small"
                  placeholder="e.g. Quotation for Print Items"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  label="Sales Executive"
                  value={formData.salesExecutive || ''}
                  onChange={(e) => handleHeaderChange('salesExecutive', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  label="Reference / Enquiry #"
                  value={formData.referenceNumber || ''}
                  onChange={(e) => handleHeaderChange('referenceNumber', e.target.value)}
                  size="small"
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Product Items Section */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Product Items & Options</Typography>
            <Box>
              <Button 
                variant="outlined" 
                startIcon={<ImportIcon />} 
                sx={{ mr: 1, borderRadius: 2 }}
                disabled // We'll implement direct import later
              >
                Import from Estimate
              </Button>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={addProduct}
                sx={{ borderRadius: 2 }}
              >
                Add Product
              </Button>
            </Box>
          </Box>

          {formData.items?.map((item, index) => (
            <Card key={item.id} sx={{ mb: 3, borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>#{index + 1} Product</Typography>
                
                <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Autocomplete
                    sx={{ flexGrow: 1, bgcolor: 'background.paper' }}
                    size="small"
                    options={products}
                    getOptionLabel={(option) => `${option.productName} (${option.productCode})`}
                    groupBy={(option) => getCategoryName(option.categoryId)}
                    value={products.find(p => p.productName === item.productName) || null}
                    onChange={(_, newValue) => {
                      const newItems = [...(formData.items || [])];
                      if (newValue) {
                        newItems[index].productName = newValue.productName;
                        newItems[index].productDescription = newValue.description;
                        newItems[index].finishedSize = `${newValue.sizes.finishedWidth}x${newValue.sizes.finishedHeight} in`;
                        
                        // Auto-add first option from product specs if options are empty
                        if (newItems[index].options.length === 0) {
                          const defaultOption: QuotationItemOption = {
                            id: Math.random().toString(36).substr(2, 9),
                            itemId: newItems[index].id,
                            quantity: 1000,
                            rate: 0,
                            total: 0,
                            gstRate: newValue.defaultGstRate || 18,
                            hsnCode: newValue.hsnCode,
                            status: 'Pending',
                            paperType: newValue.paperOptions.paperTypes[0] || '',
                            gsm: newValue.paperOptions.gsms[0] || 0,
                            colors: newValue.printOptions.colors,
                            printingSide: newValue.printOptions.side === 'Both Side' ? 'Both Side' : 'Single Side'
                          };
                          newItems[index].options = [defaultOption];
                        }
                      } else {
                        newItems[index].productName = '';
                      }
                      setFormData(prev => ({ ...prev, items: newItems }));
                    }}
                    noOptionsText={
                      <Box sx={{ p: 1, textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>No active products found</Typography>
                        {onModuleChange && (
                          <Button 
                            size="small" 
                            startIcon={<CreateIcon />} 
                            onClick={() => onModuleChange('products')}
                            variant="contained"
                            sx={{ borderRadius: 2 }}
                          >
                            Create Product
                          </Button>
                        )}
                      </Box>
                    }
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        placeholder="Search by Product Name, Code, or Category *" 
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {option.productName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Code: {option.productCode} | Category: {getCategoryName(option.categoryId)}
                          </Typography>
                        </Box>
                      </li>
                    )}
                  />
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    sx={{ height: 40, minWidth: 'auto', px: 1, whiteSpace: 'nowrap', fontSize: '0.75rem' }}
                    onClick={() => {
                      setActiveItemIndex(index);
                      setProductQuickCreateOpen(true);
                    }}
                  >
                    ➕ New Product
                  </Button>
                </Box>

                <Tooltip title="Remove Product">
                  <IconButton color="error" onClick={() => removeProduct(item.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ p: 2 }}>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Product Description"
                      value={item.productDescription || ''}
                      onChange={(e) => {
                        const newItems = [...(formData.items || [])];
                        newItems[index].productDescription = e.target.value;
                        setFormData(prev => ({ ...prev, items: newItems }));
                      }}
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Sizes (Open/Close/Finished)"
                      value={item.finishedSize || ''}
                      onChange={(e) => {
                        const newItems = [...(formData.items || [])];
                        newItems[index].finishedSize = e.target.value;
                        setFormData(prev => ({ ...prev, items: newItems }));
                      }}
                      size="small"
                      placeholder="e.g. 8.5x11 in"
                    />
                  </Grid>
                </Grid>

                <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary', display: 'block', mb: 1 }}>
                  Pricing Options
                </Typography>
                
                <TableContainer component={MuiPaper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Spec Detail (Paper/GSM/Sides)</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Rate (₹)</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>GST (%)</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Total (₹)</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {item.options.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 2 }}>
                            <Button size="small" startIcon={<AddIcon />} onClick={() => addOption(item.id)}>
                              Add First Option
                            </Button>
                          </TableCell>
                        </TableRow>
                      ) : (
                        item.options.map((opt, optIndex) => (
                          <TableRow key={opt.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                  select
                                  size="small"
                                  label="Paper Type"
                                  value={opt.paperType || ''}
                                  onChange={(e) => updateOption(item.id, opt.id, 'paperType', e.target.value)}
                                  sx={{ width: 150 }}
                                >
                                  {paperCategories.map((cat) => (
                                    <MenuItem key={cat.id} value={cat.name}>{cat.name}</MenuItem>
                                  ))}
                                </TextField>
                                <TextField
                                  select
                                  size="small"
                                  label="GSM"
                                  value={opt.gsm || ''}
                                  onChange={(e) => updateOption(item.id, opt.id, 'gsm', Number(e.target.value))}
                                  sx={{ width: 100 }}
                                >
                                  {gsmOptions.map((g) => (
                                    <MenuItem key={g.id} value={g.gsmValue}>{g.gsmValue} GSM</MenuItem>
                                  ))}
                                </TextField>
                                <TextField
                                  select
                                  size="small"
                                  label="Side"
                                  value={opt.printingSide}
                                  onChange={(e) => updateOption(item.id, opt.id, 'printingSide', e.target.value)}
                                  sx={{ width: 120 }}
                                >
                                  <MenuItem value="Single Side">Single Side</MenuItem>
                                  <MenuItem value="Both Side">Both Side</MenuItem>
                                </TextField>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={opt.quantity}
                                onChange={(e) => updateOption(item.id, opt.id, 'quantity', Number(e.target.value))}
                                sx={{ width: 100 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={opt.rate}
                                onChange={(e) => updateOption(item.id, opt.id, 'rate', Number(e.target.value))}
                                sx={{ width: 100 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                select
                                size="small"
                                value={opt.gstRate}
                                onChange={(e) => updateOption(item.id, opt.id, 'gstRate', Number(e.target.value))}
                                sx={{ width: 80 }}
                              >
                                {[0, 5, 12, 18].map(rate => (
                                  <MenuItem key={rate} value={rate}>{rate}%</MenuItem>
                                ))}
                              </TextField>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                              ₹ {opt.total.toLocaleString()}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton size="small" onClick={() => addOption(item.id, opt)}>
                                <DuplicateIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => removeOption(item.id, opt.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      {item.options.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <Button size="small" startIcon={<AddIcon />} onClick={() => addOption(item.id)}>
                              Add Another Option
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Card>
          ))}
          
          {formData.items?.length === 0 && (
            <Box sx={{ py: 8, textAlign: 'center', border: '2px dashed', borderColor: 'divider', borderRadius: 3 }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>No product items added to this quotation</Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={addProduct}>
                Add First Product
              </Button>
            </Box>
          )}
        </Grid>

        {/* Terms & Conditions Section */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Terms & Conditions</Typography>
            <Grid container spacing={2}>
              {formData.terms?.map((term, index) => (
                <Grid size={{ xs: 12, md: 6 }} key={term.id}>
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label={`Term ${index + 1}: ${term.title}`}
                      value={term.content}
                      onChange={(e) => {
                        const newTerms = [...(formData.terms || [])];
                        newTerms[index].content = e.target.value;
                        setFormData(prev => ({ ...prev, terms: newTerms }));
                      }}
                      size="small"
                      multiline
                      rows={2}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Card>
        </Grid>
      </Grid>
      <CustomerQuickCreateModal 
        open={quickCreateOpen} 
        onClose={() => setQuickCreateOpen(false)} 
        onSuccess={handleQuickCreateSuccess} 
      />
      <ProductQuickCreateModal
        open={productQuickCreateOpen}
        onClose={() => setProductQuickCreateOpen(false)}
        onSuccess={handleProductQuickCreateSuccess}
      />
    </Box>
  );
}
