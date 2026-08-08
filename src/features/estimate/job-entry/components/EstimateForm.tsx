/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  FormHelperText,
  Divider,
  Stack,
  Chip,
  Checkbox,
  FormGroup,
  Paper as MuiPaper,
  InputAdornment,
  Tooltip,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert
} from '@mui/material';
import {
  Description as DocIcon,
  People as PeopleIcon,
  ShoppingCart as QuantityIcon,
  AspectRatio as SizeIcon,
  ColorLens as PrintIcon,
  MenuBook as PaperIcon,
  PrecisionManufacturing as MachineIcon,
  AutoAwesome as AutoIcon,
  CheckCircle as CheckIcon,
  Undo as ResetIcon,
  ErrorOutlined as ErrorIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material';

import {
  EstimateJob,
  PriorityType,
  UnitType,
  PrintingType,
  PrintingProcess,
  MachineSelectionType,
  EstimateFormErrors,
  LayoutData
} from '../types';
import { validateEstimateJob } from '../validation';

import { PaperIntelligenceService, EstimateLayout } from '../services/layoutApi';
import { isSheetMappedToCategory } from '../../../paper-master/services/api';
import { calculateLayout, validateLayout } from '../services/layoutEngine';
import { UpsLayoutPreview } from './UpsLayoutPreview';
import { LayoutLegend } from './LayoutLegend';

// Import Finishing Engine for Cost Calculations
import { FinishingApiService } from '../../finishing-engine/services/api';
import { FinishingMasterItem } from '../../finishing-engine/types';

// Import Services to populate dropdowns
import { CustomerMasterService } from '../../../customer-master/services/mockApi';
import { ProductApiService } from '../../../product-master/services/api';
import { PaperApiService } from '../../../paper-master/services/api';
import { MachineApiService } from '../../../machines/services/api';

// Pre-fetched types for state
import { CustomerMasterItem } from '../../../customer-master/types';
import CustomerQuickCreateModal from '../../../../components/CustomerQuickCreateModal';
import { ProductMasterItem, ProductCategory, FileAccessoriesType } from '../../../product-master/types';
import ProductQuickCreateModal from '../../../../components/ProductQuickCreateModal';
import { PaperMasterItem, PaperCategory, PaperGSM, ParentSheetSize } from '../../../paper-master/types';
import { MachineMasterItem } from '../../../machines/types';

interface EstimateFormProps {
  initialData?: EstimateJob | null;
  onSubmit: (data: Omit<EstimateJob, 'id' | 'estimateNumber' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const FINISHING_CATALOG = [
  { name: 'Lamination', description: 'Thin plastic film layer' },
  { name: 'Matt Lamination', description: 'Non-reflective premium finish' },
  { name: 'Gloss Lamination', description: 'High-shine protective finish' },
  { name: 'UV Varnishing', description: 'Overall liquid gloss coat' },
  { name: 'Spot UV', description: 'Gloss on selected visual areas' },
  { name: 'Hot Foil Stamping', description: 'Metallic foil heat transfer' },
  { name: 'Embossing', description: 'Raised dimensional effect' },
  { name: 'Debossing', description: 'Sunken dimensional effect' },
  { name: 'Die Cutting', description: 'Custom shaped stamp cut-outs' },
  { name: 'Creasing', description: 'Score lines for easy folding' },
  { name: 'Folding', description: 'Mechanical folding' },
  { name: 'Pasting', description: 'Adhesive joint sealing' },
  { name: 'Eyeletting', description: 'Metal ring enforcement' },
  { name: 'Binding', description: 'Booklet edge assembly' },
  { name: 'Padding', description: 'Glued notepad binding' },
  { name: 'Perforation', description: 'Tear-away micro dotted lines' },
  { name: 'Numbering', description: 'Consecutive serial stamping' }
];

const SALES_EXECUTIVES = ['Amit Saxena', 'Priya Sharma', 'Rajesh Verma', 'Subir Ghosal', 'John Doe'];

export default function EstimateForm({ initialData, onSubmit, onCancel, isSubmitting = false }: EstimateFormProps) {
  // --- MASTER LISTS STATE ---
  const [customers, setCustomers] = useState<CustomerMasterItem[]>([]);
  const [products, setProducts] = useState<ProductMasterItem[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [papers, setPapers] = useState<PaperMasterItem[]>([]);
  const [paperCategories, setPaperCategories] = useState<PaperCategory[]>([]);
  const [allGSMs, setAllGSMs] = useState<PaperGSM[]>([]);
  const [allSheets, setAllSheets] = useState<ParentSheetSize[]>([]);
  const [machines, setMachines] = useState<MachineMasterItem[]>([]);

  // --- FORM FIELD STATES ---
  const [estimateDate, setEstimateDate] = useState<string>(
    initialData?.estimateDate || new Date().toISOString().split('T')[0]
  );
  const [customerId, setCustomerId] = useState<string>(initialData?.customerId || '');
  const [productId, setProductId] = useState<string>(initialData?.productId || '');
  const [productCategoryName, setProductCategoryName] = useState<string>('');
  const [productCode, setProductCode] = useState<string>('');
  const [productType, setProductType] = useState<string>('');
  const [productDescription, setProductDescription] = useState<string>('');
  const [salesExecutive, setSalesExecutive] = useState<string>(initialData?.salesExecutive || '');
  const [priority, setPriority] = useState<PriorityType>(initialData?.priority || 'Normal');
  const [remarks, setRemarks] = useState<string>(initialData?.remarks || '');

  // Quantities
  const [orderQuantity, setOrderQuantity] = useState<number | ''>(
    initialData ? initialData.orderQuantity : ''
  );
  const [extraQuantity, setExtraQuantity] = useState<number | ''>(
    initialData ? initialData.extraQuantity : 0
  );
  const [finalQuantity, setFinalQuantity] = useState<number>(initialData?.finalQuantity || 0);

  // Sizes
  const [sizeUnit, setSizeUnit] = useState<UnitType>(initialData?.sizeUnit || 'inch');
  const [finishedWidth, setFinishedWidth] = useState<number | ''>(
    initialData ? initialData.finishedWidth : ''
  );
  const [finishedHeight, setFinishedHeight] = useState<number | ''>(
    initialData ? initialData.finishedHeight : ''
  );
  const [closeWidth, setCloseWidth] = useState<number | ''>(
    initialData ? initialData.closeWidth : ''
  );
  const [closeHeight, setCloseHeight] = useState<number | ''>(
    initialData ? initialData.closeHeight : ''
  );
  const [openWidth, setOpenWidth] = useState<number | ''>(
    initialData ? initialData.openWidth : ''
  );
  const [openHeight, setOpenHeight] = useState<number | ''>(
    initialData ? initialData.openHeight : ''
  );

  // Printing
  const [frontColor, setFrontColor] = useState<number>(initialData?.frontColor ?? 4);
  const [backColor, setBackColor] = useState<number>(initialData?.backColor ?? 0);
  const [printingType, setPrintingType] = useState<PrintingType>(
    initialData?.printingType || 'Single Side'
  );
  const [printingProcess, setPrintingProcess] = useState<PrintingProcess>(
    initialData?.printingProcess || 'Sheetwise'
  );

  // Machine
  const [machineSelectionMode, setMachineSelectionMode] = useState<MachineSelectionType>(
    initialData?.machineSelectionMode || 'Auto'
  );
  const [machineId, setMachineId] = useState<string>(initialData?.machineId || '');

  // Paper
  const [paperCategoryId, setPaperCategoryId] = useState<string>(initialData?.paperCategoryId || '');
  const [paperId, setPaperId] = useState<string>(initialData?.paperId || '');
  const [gsmId, setGsmId] = useState<string>(initialData?.gsmId || '');
  const [parentSheetId, setParentSheetId] = useState<string>(initialData?.parentSheetId || '');
  const [paperBrand, setPaperBrand] = useState<string>(initialData?.paperBrand || '');
  const [paperRateOverride, setPaperRateOverride] = useState<number | ''>(
    initialData?.paperRateOverride !== undefined && initialData?.paperRateOverride !== null
      ? initialData.paperRateOverride
      : ''
  );
  const [paperWastageSheets, setPaperWastageSheets] = useState<number>(
    initialData?.paperWastageSheets !== undefined ? initialData.paperWastageSheets : 0
  );
  const [allRates, setAllRates] = useState<any[]>([]);
  const isFirstRender = useRef(true);

  // --- PRINTING & PLATE STATES (Printopia ERP Business Rules) ---
  const [samePlateForFrontAndBack, setSamePlateForFrontAndBack] = useState<boolean>(initialData?.samePlateForFrontAndBack || false);
  const [manualPlateQty, setManualPlateQty] = useState<string>(initialData?.manualPlateQty !== undefined ? String(initialData.manualPlateQty) : '');
  const [plateRateOverride, setPlateRateOverride] = useState<number | ''>(initialData?.plateRateOverride !== undefined ? initialData.plateRateOverride : '');
  const [printingRateOverride, setPrintingRateOverride] = useState<number | ''>(initialData?.printingRateOverride !== undefined ? initialData.printingRateOverride : '');

  // --- OTHER CHARGES & PROFIT ---
  const [designCharges, setDesignCharges] = useState<number>(initialData?.designCharges || 0);
  const [packagingCharges, setPackagingCharges] = useState<number>(initialData?.packagingCharges || 0);
  const [transportCharges, setTransportCharges] = useState<number>(initialData?.transportCharges || 0);
  const [miscCharges, setMiscCharges] = useState<number>(initialData?.miscCharges || 0);
  const [profitPercentage, setProfitPercentage] = useState<number>(initialData?.profitPercentage !== undefined ? initialData.profitPercentage : 15);
  const [layoutData, setLayoutData] = useState<LayoutData | undefined>(initialData?.layoutData);

  // --- FILE ACCESSORIES (NEW FIELD) ---
  const [fileAccessories, setFileAccessories] = useState<FileAccessoriesType>(initialData?.fileAccessories || 'None');
  const [fileAccessoriesVisible, setFileAccessoriesVisible] = useState<boolean>(false);
  const [fileAccessoriesMandatory, setFileAccessoriesMandatory] = useState<boolean>(false);

  // --- NEW CORE CALCULATION STATES ---
  const [ups, setUps] = useState<number | ''>(
    initialData?.ups !== undefined && initialData?.ups !== null
      ? Math.floor(Number(initialData.ups))
      : ''
  );
  const [isUpsManuallyEdited, setIsUpsManuallyEdited] = useState<boolean>(
    typeof initialData?.ups === 'number'
  );
  const [cuttingFactor, setCuttingFactor] = useState<string>(initialData?.cuttingFactor || '1:1');
  const [customCuttingFactor, setCustomCuttingFactor] = useState<number | ''>(initialData?.customCuttingFactor || '');

  // --- ENVELOPE BUSINESS RULE ---
  const isEnvelope = productCategoryName?.toLowerCase().includes('envelope');
  useEffect(() => {
    if (isEnvelope) {
      setPrintingType('Single Side');
      setPrintingProcess('Sheetwise');
      setBackColor(0);
    }
  }, [isEnvelope]);

  // Ensure Single Side is Sheetwise
  useEffect(() => {
    if (printingType === 'Single Side' && printingProcess !== 'Sheetwise') {
      setPrintingProcess('Sheetwise');
    }
  }, [printingType, printingProcess]);

  // --- UPS SUGGESTION LOGIC (Only size based, paper type and GSM do not affect) ---
  const upsCalculations = useMemo(() => {
    if (!parentSheetId || !openWidth || !openHeight) {
      return { normalUps: 0, rotatedUps: 0, suggestedUps: 0 };
    }

    const sheet = allSheets.find(s => s.id === parentSheetId);
    if (!sheet) {
      return { normalUps: 0, rotatedUps: 0, suggestedUps: 0 };
    }

    const pW_raw = Number(openWidth);
    const pH_raw = Number(openHeight);
    const PW_raw = sheet.width;
    const PH_raw = sheet.height;

    if (pW_raw <= 0 || pH_raw <= 0 || PW_raw <= 0 || PH_raw <= 0) {
      return { normalUps: 0, rotatedUps: 0, suggestedUps: 0 };
    }

    // Convert both to same unit (inches) for calculations to prevent mismatch bugs
    const PW = sheet.unit === 'mm' ? PW_raw / 25.4 : PW_raw;
    const PH = sheet.unit === 'mm' ? PH_raw / 25.4 : PH_raw;

    const pW = sizeUnit === 'mm' ? pW_raw / 25.4 : pW_raw;
    const pH = sizeUnit === 'mm' ? pH_raw / 25.4 : pH_raw;

    // Prevent division by zero
    if (pW === 0 || pH === 0) {
      return { normalUps: 0, rotatedUps: 0, suggestedUps: 0 };
    }

    const normalUps = Math.floor(PW / pW) * Math.floor(PH / pH);
    const rotatedUps = Math.floor(PW / pH) * Math.floor(PH / pW);
    const suggestedUps = Math.max(0, Math.max(normalUps, rotatedUps));

    return { normalUps, rotatedUps, suggestedUps };
  }, [parentSheetId, openWidth, openHeight, sizeUnit, allSheets]);

  // Recalculate Suggested UPS immediately and auto-update Final UPS if not manually edited
  useEffect(() => {
    if (!isUpsManuallyEdited && upsCalculations.suggestedUps > 0) {
      setUps(upsCalculations.suggestedUps);
    }
  }, [upsCalculations.suggestedUps, isUpsManuallyEdited]);

  useEffect(() => {
    if (!parentSheetId || !machineId) return;

    const sheet = allSheets.find(s => s.id === parentSheetId);
    const machine = machines.find(m => m.id === machineId);
    if (!sheet || !machine) return;

    // Suggested Cutting Pattern
    // Simple logic: if parent sheet size > machine max sheet size, suggest cutting.
    const PW_mm = sheet.width * 25.4;
    const PH_mm = sheet.height * 25.4;
    
    let suggestedCutting = '1:1';
    if (PW_mm > machine.maxSheetWidth || PH_mm > machine.maxSheetHeight) {
      // If it doesn't fit, suggest 1:2 or 1:4
      if (PW_mm / 2 <= machine.maxSheetWidth && PH_mm <= machine.maxSheetHeight) {
        suggestedCutting = '1:2';
      } else if (PW_mm / 2 <= machine.maxSheetWidth && PH_mm / 2 <= machine.maxSheetHeight) {
        suggestedCutting = '1:4';
      } else {
        suggestedCutting = '1:2'; // Default fallback to 1:2 if still too big
      }
    }

    if (cuttingFactor === '1:1' && isFirstRender.current) {
      setCuttingFactor(suggestedCutting);
    }
  }, [parentSheetId, machineId, allSheets, machines]);

  const layoutParams = useMemo(() => {
    const sheet = allSheets.find(s => s.id === parentSheetId);
    const machine = machines.find(m => m.id === machineId);
    
    if (!sheet || !machine || !openWidth || !openHeight) {
      return null;
    }

    const pW_raw = Number(openWidth);
    const pH_raw = Number(openHeight);
    
    const productW_mm = sizeUnit === 'inch' ? pW_raw * 25.4 : pW_raw;
    const productH_mm = sizeUnit === 'inch' ? pH_raw * 25.4 : pH_raw;
    
    const parentW_mm = sheet.unit === 'inch' ? sheet.width * 25.4 : sheet.width;
    const parentH_mm = sheet.unit === 'inch' ? sheet.height * 25.4 : sheet.height;

    let machineW_mm = parentW_mm;
    let machineH_mm = parentH_mm;
    let numMachineSheets = 1;

    if (cuttingFactor === '1:2') {
      if (parentW_mm >= parentH_mm) {
        machineW_mm = parentW_mm / 2;
      } else {
        machineH_mm = parentH_mm / 2;
      }
      numMachineSheets = 2;
    } else if (cuttingFactor === '1:4') {
      machineW_mm = parentW_mm / 2;
      machineH_mm = parentH_mm / 2;
      numMachineSheets = 4;
    } else if (cuttingFactor === '1:3') {
       if (parentW_mm >= parentH_mm) {
         machineW_mm = parentW_mm / 3;
       } else {
         machineH_mm = parentH_mm / 3;
       }
       numMachineSheets = 3;
    } else if (cuttingFactor === 'Custom' && typeof customCuttingFactor === 'number' && customCuttingFactor > 0) {
       if (parentW_mm >= parentH_mm) {
         machineW_mm = parentW_mm / customCuttingFactor;
       } else {
         machineH_mm = parentH_mm / customCuttingFactor;
       }
       numMachineSheets = customCuttingFactor;
    }

    return {
      parentWidth: Number(parentW_mm.toFixed(2)),
      parentHeight: Number(parentH_mm.toFixed(2)),
      machineWidth: Number(machineW_mm.toFixed(2)),
      machineHeight: Number(machineH_mm.toFixed(2)),
      productWidth: Number(productW_mm.toFixed(2)),
      productHeight: Number(productH_mm.toFixed(2)),
      gripperMargin: machine.gripperMargin || 0,
      sideMargin: machine.leftMargin || 0,
      tailMargin: machine.tailMargin || 0,
      cuttingMethod: cuttingFactor,
      numMachineSheets,
      printingMethod: printingProcess
    };
  }, [parentSheetId, machineId, openWidth, openHeight, sizeUnit, cuttingFactor, customCuttingFactor, printingProcess, allSheets, machines]);

  useEffect(() => {
    if (layoutData && !isUpsManuallyEdited) {
      setUps(layoutData.totalUps);
    }
  }, [layoutData?.totalUps, isUpsManuallyEdited]);

  // --- FINISHING MASTERS STATE ---
  const [finishingMasters, setFinishingMasters] = useState<FinishingMasterItem[]>([]);

  // Paper Intelligence calculated results state
  const [calculatedLayouts, setCalculatedLayouts] = useState<EstimateLayout[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);

  // Run Paper Intelligence Engine automatically
  useEffect(() => {
    async function runFormIntelligence() {
      if (
        !paperId ||
        !gsmId ||
        !openWidth ||
        Number(openWidth) <= 0 ||
        !openHeight ||
        Number(openHeight) <= 0 ||
        !finalQuantity ||
        finalQuantity <= 0
      ) {
        setCalculatedLayouts([]);
        setSelectedLayoutId('');
        return;
      }

      try {
        setIntelligenceError(null);
        const results = await PaperIntelligenceService.calculateLayouts({
          finishedWidth: Number(finishedWidth) || 0,
          finishedHeight: Number(finishedHeight) || 0,
          openWidth: Number(openWidth),
          openHeight: Number(openHeight),
          sizeUnit: sizeUnit,
          quantity: finalQuantity,
          paperId: paperId,
          gsmId: gsmId,
          printingSide: printingType,
          machineId: undefined, // Always check all to allow suggestions
          paperWastageSheets: Number(paperWastageSheets) || 0
        });

        if (results.length === 0) {
          setCalculatedLayouts([]);
          setSelectedLayoutId('');
          setIntelligenceError('No suitable machine found for this layout size.');
          return;
        }

        let filteredResults = results;
        if (machineSelectionMode === 'Manual') {
          filteredResults = results.filter(r => r.machineId === machineId);
          if (filteredResults.length === 0) {
             const alternative = results[0];
             setIntelligenceError(`Selected machine cannot print this sheet size. ERP Suggests: ${alternative.machineName}`);
             setCalculatedLayouts([]);
             setSelectedLayoutId('');
             return;
          }
        }

        // Recommend layouts using lowest_waste as default
        const recommendedResults = PaperIntelligenceService.recommendLayouts(filteredResults, 'lowest_waste');
        setCalculatedLayouts(recommendedResults);

        // Select the recommended or first layout
        const rec = recommendedResults.find((r) => r.isRecommended) || recommendedResults[0];
        if (rec) {
          setSelectedLayoutId(rec.id);
        }
      } catch (err: any) {
        console.error('Error calculating intelligence:', err);
        setCalculatedLayouts([]);
        setSelectedLayoutId('');
        setIntelligenceError(err.message || 'Error running Paper Intelligence Engine.');
      }
    }

    runFormIntelligence();
  }, [
    paperId,
    gsmId,
    openWidth,
    openHeight,
    sizeUnit,
    finalQuantity,
    printingType,
    machineSelectionMode,
    machineId,
    finishedWidth,
    finishedHeight,
    paperWastageSheets
  ]);

  const activeLayout = calculatedLayouts.find((l) => l.id === selectedLayoutId);

  // Sync parentSheetId and machineId with the active layout from paper intelligence
  useEffect(() => {
    if (activeLayout) {
      setParentSheetId(activeLayout.parentSheetId);
      if (machineSelectionMode === 'Auto') {
        setMachineId(activeLayout.machineId);
      }
    }
  }, [activeLayout, machineSelectionMode]);

  // Finishing
  const [finishingItems, setFinishingItems] = useState<Array<{
    name: string;
    quantity: number;
    rate: number;
    total: number;
  }>>(initialData?.finishingItems || []);

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [productQuickCreateOpen, setProductQuickCreateOpen] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<EstimateFormErrors>({});
  const [productErrorMessage, setProductErrorMessage] = useState<string | null>(null);

  // --- REFRESH ACTIVE PRODUCTS FROM SHARED SERVICE ---
  const handleQuickCreateSuccess = (customer: CustomerMasterItem) => {
    setCustomers(prev => [...prev, customer]);
    setCustomerId(customer.id);
    if (customer.salesExecutive) {
      setSalesExecutive(customer.salesExecutive);
    }
  };

  const handleProductQuickCreateSuccess = (product: ProductMasterItem) => {
    setProducts(prev => [...prev, product]);
    handleProductChange(product.id);
  };

  // --- REFRESH ACTIVE PRODUCTS FROM SHARED SERVICE ---
  // VERIFICATION: Product Master and Estimate Module share the exact same ProductApiService
  // and read/write from the identical database table key "printopia_product_master" in LocalStorage.
  const refreshProducts = async () => {
    try {
      const activeProducts = await ProductApiService.getProducts({ status: 'Active' });
      setProducts(activeProducts);

      const allProducts = await ProductApiService.getProducts();
      if (allProducts.length > 0 && activeProducts.length === 0) {
        const errMsg = 'Product Master has products in the database, but no "Active" products are available. Please activate products inside the Product Master tab.';
        console.error(`[Product Integration Error]: ${errMsg}`, { totalInMaster: allProducts.length, activeFound: 0 });
        setProductErrorMessage(errMsg);
      } else if (allProducts.length === 0) {
        const errMsg = 'No Product Found. Please create Product in Product Master.';
        console.error(`[Product Integration Error]: ${errMsg}`);
        setProductErrorMessage(errMsg);
      } else {
        setProductErrorMessage(null);
      }
    } catch (err: any) {
      console.error('[Product Integration Error]: Failed to fetch products from shared ProductApiService: ', err);
      setProductErrorMessage('Failed to load products from shared Product Master service.');
    }
  };

  // --- LOAD MASTERS ON STARTUP ---
  useEffect(() => {
    async function loadData() {
      try {
        // Load customers
        const customerList = CustomerMasterService.getCustomers();
        setCustomers(customerList);

        // Load products (using our robust refreshing function)
        await refreshProducts();

        const prodCats = await ProductApiService.getCategories();
        setProductCategories(prodCats);

        // Load paper categories, papers, gsms, sheets
        const cats = await PaperApiService.getCategories();
        setPaperCategories(cats);

        const paperList = await PaperApiService.getPapers({ status: 'Active' });
        setPapers(paperList);

        const gsmList = await PaperApiService.getGSMs();
        setAllGSMs(gsmList);

        const sheetList = await PaperApiService.getParentSheets();
        setAllSheets(sheetList);

        const rateList = await PaperApiService.getRateHistory();
        setAllRates(rateList);

        // Load machines
        const machineList = await MachineApiService.getMachines({ status: 'Active' });
        setMachines(machineList);

        // Load finishing masters for automatic cost calculation
        const finList = FinishingApiService.getMasterItems();
        setFinishingMasters(finList);
      } catch (err) {
        console.error('Failed to load master metadata: ', err);
      }
    }
    loadData();

    // Set up storage listener for automatic live refresh when another tab/form alters localStorage database table
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'printopia_product_master') {
        refreshProducts();
      }
      if (e.key === 'printopia_paper_master' || e.key === 'printopia_paper_rates') {
        const paperList = await PaperApiService.getPapers({ status: 'Active' });
        setPapers(paperList);
        const rateList = await PaperApiService.getRateHistory();
        setAllRates(rateList);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Set up a brief auto-polling mechanism to ensure perfect synchronization between coexisting tabs
    const intervalId = setInterval(refreshProducts, 3000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, []);

  // --- AUTO-CALCULATE FINAL QUANTITY ---
  useEffect(() => {
    const oQ = Number(orderQuantity) || 0;
    const eQ = Number(extraQuantity) || 0;
    setFinalQuantity(oQ + eQ);
  }, [orderQuantity, extraQuantity]);

  // --- AUTO-SET PRINTING TYPE BASED ON COLORS ---
  useEffect(() => {
    if (backColor > 0) {
      setPrintingType('Both Side');
    } else {
      setPrintingType('Single Side');
    }
  }, [backColor]);

  // --- UNIT CONVERSION LOGIC ---
  const handleUnitChange = (newUnit: UnitType) => {
    if (sizeUnit === newUnit) return;

    // Conversion factor (1 inch = 25.4 mm)
    const factor = newUnit === 'mm' ? 25.4 : 1 / 25.4;
    const convert = (val: number | '') => {
      if (val === '' || isNaN(val)) return '';
      // Rounded to 2 decimal places
      return Math.round(val * factor * 100) / 100;
    };

    setFinishedWidth(convert(finishedWidth));
    setFinishedHeight(convert(finishedHeight));
    setCloseWidth(convert(closeWidth));
    setCloseHeight(convert(closeHeight));
    setOpenWidth(convert(openWidth));
    setOpenHeight(convert(openHeight));
    setSizeUnit(newUnit);
  };

  // --- AUTO-FILL SIZES FROM PRODUCT SELECTION ---
  const handleProductChange = (pId: string) => {
    setProductId(pId);
    if (!pId) {
      setProductCode('');
      setProductDescription('');
      setProductCategoryName('');
      setProductType('');
      return;
    }

    const selectedProd = products.find((p) => p.id === pId);
    if (selectedProd) {
      setProductCode(selectedProd.productCode || '');
      setProductDescription(selectedProd.description || '');
      setProductType(selectedProd.printOptions?.side || 'Standard');
      const cat = productCategories.find((c) => c.id === selectedProd.categoryId);
      setProductCategoryName(cat ? cat.name : '');
      
      setFileAccessoriesVisible(selectedProd.fileAccessoriesEnabled || false);
      setFileAccessoriesMandatory(selectedProd.fileAccessoriesMandatory || false);
      if (!selectedProd.fileAccessoriesEnabled) {
        setFileAccessories('None');
      }

      if (selectedProd.sizes) {
        const { openWidth, openHeight, closeWidth, closeHeight, finishedWidth, finishedHeight } = selectedProd.sizes;
        
        // The product master usually saves sizes in INCH. Let's assume it matches product master.
        // If our current unit is MM, convert them!
        const conversion = sizeUnit === 'mm' ? 25.4 : 1;
        const round = (num: number) => Math.round(num * conversion * 100) / 100;

        setFinishedWidth(round(finishedWidth));
        setFinishedHeight(round(finishedHeight));
        setCloseWidth(round(closeWidth));
        setCloseHeight(round(closeHeight));
        setOpenWidth(round(openWidth));
        setOpenHeight(round(openHeight));
      }

      // Auto-set Printing specifications if defined
      if (selectedProd.printOptions) {
        if (selectedProd.printOptions.side === 'Single Side' || selectedProd.printOptions.side === 'Both Side') {
          setPrintingType(selectedProd.printOptions.side);
        }
        
        // Parse standard color text e.g., "4 Color", "1 Color", "2 Color"
        const colorsStr = selectedProd.printOptions.colors || '';
        const match = colorsStr.match(/\d+/);
        if (match) {
          const count = parseInt(match[0], 10);
          setFrontColor(count);
          if (selectedProd.printOptions.side === 'Both Side') {
            setBackColor(count);
          } else {
            setBackColor(0);
          }
        }
      }

      // Auto-set finishing defaults
      if (selectedProd.finishingOptions && selectedProd.finishingOptions.length > 0) {
        // Map names to matched finishing options in the catalog
        const matches = selectedProd.finishingOptions.map(f => {
          // Find standard matches
          const found = FINISHING_CATALOG.find(cat => cat.name.toLowerCase() === f.toLowerCase() || f.toLowerCase().includes(cat.name.toLowerCase()));
          return found ? found.name : null;
        }).filter(Boolean) as string[];

        if (matches.length > 0) {
          const items = matches.map(name => {
            const master = finishingMasters.find(m => m.name.toLowerCase() === name.toLowerCase());
            const rate = master?.defaultRate || 0.5; // fallback default
            const qty = finalQuantity || 1000;
            return {
              name,
              quantity: qty,
              rate,
              total: qty * rate
            };
          });
          setFinishingItems(items);
        }
      }

      // Never automatically select paper specifications or GSM from product template.
      // Clear any auto-filled/default selections to require manual selection from the user.
      // Suggest/default only the matching Paper Category from paperCategories if possible.
      let suggestedCatId = '';
      if (selectedProd.paperOptions && selectedProd.paperOptions.paperTypes && selectedProd.paperOptions.paperTypes.length > 0) {
        const firstSuggestedType = selectedProd.paperOptions.paperTypes[0].toLowerCase();
        const matchedCat = paperCategories.find(
          (cat) =>
            firstSuggestedType.includes(cat.name.toLowerCase()) ||
            cat.name.toLowerCase().includes(firstSuggestedType) ||
            (cat.code && firstSuggestedType.includes(cat.code.toLowerCase()))
        );
        if (matchedCat) {
          suggestedCatId = matchedCat.id;
        }
      }
      setPaperCategoryId(suggestedCatId);
      setPaperId('');
      setGsmId('');
      setParentSheetId('');
    }
  };

  // Sync fields when productId, products, or productCategories change (essential for edit/initial load)
  useEffect(() => {
    if (productId && products.length > 0) {
      const selectedProd = products.find((p) => p.id === productId);
      if (selectedProd) {
        setProductCode((prev) => prev || selectedProd.productCode || '');
        setProductDescription((prev) => prev || selectedProd.description || '');
        setProductType((prev) => prev || selectedProd.printOptions?.side || 'Standard');
        if (productCategories.length > 0) {
          const cat = productCategories.find((c) => c.id === selectedProd.categoryId);
          setProductCategoryName((prev) => prev || (cat ? cat.name : ''));
        }
      }
    }
  }, [productId, products, productCategories]);

  // Clear downstream selections when upstream selections change
  useEffect(() => {
    if (isFirstRender.current) {
      return;
    }
    setPaperBrand('');
    setGsmId('');
    setParentSheetId('');
    setPaperId('');
    setPaperRateOverride('');
  }, [paperCategoryId]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPaperId('');
    setPaperRateOverride('');
  }, [gsmId]);

  // --- SYNC PARENT SHEET MANUALLY AND UPDATE SELECTED LAYOUT ---
  const handleParentSheetChange = (sheetId: string) => {
    setParentSheetId(sheetId);
    if (sheetId && calculatedLayouts.length > 0) {
      const matchedLayout = calculatedLayouts.find((l) => l.parentSheetId === sheetId);
      if (matchedLayout) {
        setSelectedLayoutId(matchedLayout.id);
      }
    }
  };

  // --- AUTO SELECT/RECOMMEND MACHINE ---
  // Simple heuristic for machine recommendation:
  // - If colors (front + back) > 1 or process is multi-color, pick a multi-color press.
  // - Else, pick a single color press.
  // - Or matches based on size limitations if machine has sheet capacity.
  const recommendedMachine = (() => {
    if (machines.length === 0) return null;

    // Filter active offset/digital machines
    const offsets = machines.filter(m => m.status === 'Active');
    if (offsets.length === 0) return null;

    const totalColors = frontColor + backColor;

    if (totalColors > 1) {
      // Look for a 4-color machine or multi-color
      const multiColorMachine = offsets.find(m => m.machineType.includes('Offset') && m.numColors >= 4);
      if (multiColorMachine) return multiColorMachine;
    }

    // Fallback to first available active machine
    return offsets[0];
  })();

  // Sync Machine Selection Mode and Machine ID
  useEffect(() => {
    if (machineSelectionMode === 'Auto' && recommendedMachine) {
      setMachineId(recommendedMachine.id);
    }
  }, [machineSelectionMode, recommendedMachine]);

  const selectedMachineObj = useMemo(() => {
    return machines.find((m) => m.id === machineId);
  }, [machines, machineId]);

  const hasLoadedInitialMachine = useRef(false);

  useEffect(() => {
    if (!selectedMachineObj) return;

    const isEditInitialLoad = initialData?.id && !hasLoadedInitialMachine.current;

    if (!isEditInitialLoad) {
      setPaperWastageSheets(selectedMachineObj.makeReadyWastage !== undefined ? selectedMachineObj.makeReadyWastage : 10);
      setPlateRateOverride(selectedMachineObj.plateCost !== undefined ? selectedMachineObj.plateCost : 0);
      setPrintingRateOverride(selectedMachineObj.printChargePer1000 !== undefined ? selectedMachineObj.printChargePer1000 : 0);
    }
    
    hasLoadedInitialMachine.current = true;
  }, [selectedMachineObj, initialData]);

  // --- FINISHING LOGIC ---
  const addFinishingItem = (name: string) => {
    const master = finishingMasters.find(m => m.name.toLowerCase() === name.toLowerCase());
    const rate = master?.defaultRate || 0.5;
    const qty = Number(finalQuantity) || 0;
    
    setFinishingItems(prev => [
      ...prev,
      { name, quantity: qty, rate, total: qty * rate }
    ]);
  };

  const updateFinishingItem = (index: number, field: 'quantity' | 'rate' | 'total', value: number) => {
    setFinishingItems(prev => {
      const newItems = [...prev];
      const item = { ...newItems[index] };
      
      if (field === 'quantity') {
        item.quantity = value;
        item.total = Number((value * item.rate).toFixed(2));
      } else if (field === 'rate') {
        item.rate = value;
        item.total = Number((item.quantity * value).toFixed(2));
      } else if (field === 'total') {
        item.total = value;
      }
      
      newItems[index] = item;
      return newItems;
    });
  };

  const removeFinishingItem = (index: number) => {
    setFinishingItems(prev => prev.filter((_, i) => i !== index));
  };

  // --- DYNAMIC COST ESTIMATE ENGINE CALCULATIONS (Printopia ERP Business Rules) ---
  const calculations = useMemo(() => {
    // 1. Core Logic (FINAL CORE CALCULATION ENGINE UPDATE)
    const currentUps = Math.floor(Number(ups)) || 1;
    const requiredParentSheets = Math.ceil(finalQuantity / currentUps);
    const finalParentSheets = requiredParentSheets + paperWastageSheets;

    let cFactor = 1;
    if (cuttingFactor === '1:2') cFactor = 2;
    else if (cuttingFactor === '1:3') cFactor = 3;
    else if (cuttingFactor === '1:4') cFactor = 4;
    else if (cuttingFactor === 'Custom') cFactor = Number(customCuttingFactor) || 1;

    // Total machine sheets produced from the parent sheets
    const machineSheetQuantity = finalParentSheets * cFactor;
    
    // Printing Passes and Impressions
    const printingPasses = printingType === 'Both Side' ? 2 : 1;
    const frontImpressions = machineSheetQuantity;
    const backImpressions = printingType === 'Both Side' ? machineSheetQuantity : 0;
    const totalImpressions = machineSheetQuantity * printingPasses;

    // 2. Paper Cost
    const paperRate = paperRateOverride !== '' ? Number(paperRateOverride) : 0;
    const paperCost = Number((finalParentSheets * paperRate).toFixed(2));

    // 3. Printing Cost
    const activeMachinePrintRate = (initialData && initialData.machineId === machineId && initialData.machinePrintRate !== undefined) ? initialData.machinePrintRate : (selectedMachineObj?.printChargePer1000 || 0);
    const printingRate = printingRateOverride !== '' ? Number(printingRateOverride) : activeMachinePrintRate;
    const printingCost = Number(((totalImpressions / 1000) * printingRate).toFixed(2));

    // 4. Plate Cost
    let systemPlateQty = 0;
    let plateSetMethod = 'Single Side Plates';
    
    // Ensure colors are valid (no 0 or negative for printed sides)
    const validFront = Math.max(1, frontColor);
    const validBack = Math.max(1, backColor);

    if (printingType === 'Single Side') {
      systemPlateQty = validFront;
    } else {
      if (printingProcess === 'Work & Turn' || printingProcess === 'Work & Tumble' || samePlateForFrontAndBack) {
        systemPlateQty = Math.max(validFront, validBack);
        plateSetMethod = 'Same plate set for both sides';
      } else {
        systemPlateQty = validFront + validBack;
        plateSetMethod = 'Separate front and back plates';
      }
    }

    const finalPlateQty = manualPlateQty !== '' ? Math.max(0, Number(manualPlateQty) || 0) : systemPlateQty;
    const activeMachinePlateRate = (initialData && initialData.machineId === machineId && initialData.machinePlateRate !== undefined) ? initialData.machinePlateRate : (selectedMachineObj?.plateCost || 0);
    const plateRate = plateRateOverride !== '' ? Number(plateRateOverride) : activeMachinePlateRate;
    const plateCost = Number((finalPlateQty * plateRate).toFixed(2));

    // 5. Finishing Cost
    let finishingCost = 0;
    
    // File Accessories Costing Logic
    let fileAccCost = 0;
    let fileAccCostConfigured = true;
    if (fileAccessories !== 'None') {
      const product = products.find(p => p.id === productId);
      const clipPrice = product?.defaultClipCost ?? 0;
      const pocketPrice = product?.defaultPocketCost ?? 0;
      
      if (fileAccessories === 'Clip') {
        fileAccCost = finalQuantity * clipPrice;
        if (clipPrice === 0) fileAccCostConfigured = false;
      } else if (fileAccessories === 'Pocket') {
        fileAccCost = finalQuantity * pocketPrice;
        if (pocketPrice === 0) fileAccCostConfigured = false;
      } else if (fileAccessories === 'Clip + Pocket') {
        fileAccCost = finalQuantity * (clipPrice + pocketPrice);
        if (clipPrice === 0 || pocketPrice === 0) fileAccCostConfigured = false;
      }
    }
    finishingCost += fileAccCost;

    const finishingDetails = finishingItems.map(item => {
      finishingCost += item.total;
      return {
        name: item.name,
        cost: item.total,
        rate: item.rate,
        rateType: 'Manual', // Since rate is editable
        setupCost: 0
      };
    });
    finishingCost = Number(finishingCost.toFixed(2));

    // 5. Other Charges
    const otherCharges = Number((designCharges + packagingCharges + transportCharges + miscCharges).toFixed(2));

    // 6. Production Cost
    const productionCost = Number((paperCost + printingCost + plateCost + finishingCost + otherCharges).toFixed(2));

    // 7. Profit Amount
    const profitAmount = Number((productionCost * (profitPercentage / 100)).toFixed(2));

    // 8. Grand Total
    const grandTotal = Number((productionCost + profitAmount).toFixed(2));

    // 9. Rate Per Piece (Divided by orderQuantity)
    const oQ = Number(orderQuantity) || 0;
    const ratePerPiece = oQ > 0 ? Number((grandTotal / oQ).toFixed(4)) : 0;

    return {
      ups: currentUps,
      requiredParentSheets,
      finalParentSheets,
      cuttingFactor,
      machineImpressions: machineSheetQuantity,
      machineSheetQuantity,
      printingPasses,
      frontImpressions,
      backImpressions,
      paperCost,
      printingCost,
      totalImpressions,
      printingRate,
      systemPlateQty,
      finalPlateQty,
      plateSetMethod,
      plateRate,
      plateCost,
      finishingCost,
      finishingDetails,
      otherCharges,
      productionCost,
      profitAmount,
      grandTotal,
      ratePerPiece,
      fileAccCostConfigured
    };
  }, [
    ups,
    cuttingFactor,
    customCuttingFactor,
    finalQuantity,
    paperWastageSheets,
    paperRateOverride,
    printingRateOverride,
    printingType,
    printingProcess,
    samePlateForFrontAndBack,
    manualPlateQty,
    plateRateOverride,
    finishingItems,
    finishingMasters,
    designCharges,
    packagingCharges,
    transportCharges,
    miscCharges,
    profitPercentage,
    orderQuantity,
    fileAccessories,
    productId,
    products,
    selectedMachineObj,
    initialData,
    machineId
  ]);

  // --- FORM SUBMISSION ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Denormalized customer name
    const customer = customers.find((c) => c.id === customerId);
    const customerName = customer ? customer.companyName : '';

    // Denormalized product name
    const product = products.find((p) => p.id === productId);
    const productName = product ? product.productName : 'Custom Product';

    // Denormalized paper details
    const category = paperCategories.find((c) => c.id === paperCategoryId);
    const paperCategoryName = category ? category.name : '';

    const paper = papers.find((p) => p.id === paperId);
    const paperName = paper ? paper.paperName : '';

    const gsmObj = allGSMs.find((g) => g.id === gsmId);
    const gsmValue = gsmObj ? gsmObj.gsmValue : 0;

    const sheetObj = allSheets.find((s) => s.id === parentSheetId);
    const parentSheetName = sheetObj ? sheetObj.name : '';

    // Denormalized machine name
    const activeMac = machines.find((m) => m.id === machineId);
    const machineName = activeMac ? activeMac.machineName : 'Auto Allocated Machine';

    // Validation for File Accessories
    if (fileAccessoriesMandatory && fileAccessories === 'None') {
      setErrors(prev => ({ ...prev, fileAccessories: 'File Accessories selection is mandatory for this product.' }));
      // Scroll to the error if possible or just stop
      return;
    }

    const jobData: Omit<EstimateJob, 'id' | 'estimateNumber' | 'createdAt' | 'updatedAt'> = {
      estimateDate,
      customerId,
      customerName,
      productId,
      productName,
      productCategoryName,
      productCode,
      productType,
      productDescription,
      salesExecutive,
      priority,
      remarks,
      orderQuantity: Number(orderQuantity) || 0,
      extraQuantity: Number(extraQuantity) || 0,
      finalQuantity,
      sizeUnit,
      finishedWidth: Number(finishedWidth) || 0,
      finishedHeight: Number(finishedHeight) || 0,
      closeWidth: Number(closeWidth) || 0,
      closeHeight: Number(closeHeight) || 0,
      openWidth: Number(openWidth) || 0,
      openHeight: Number(openHeight) || 0,
      frontColor,
      backColor,
      printingType,
      printingProcess,
      paperCategoryId,
      paperCategoryName,
      paperId,
      paperName,
      gsmId,
      gsmValue,
      parentSheetId,
      parentSheetName,
      paperBrand,
      paperRateOverride: paperRateOverride === '' ? undefined : Number(paperRateOverride),
      paperWastageSheets: Number(paperWastageSheets) || 0,
      machineSelectionMode,
      machineId,
      machineName,
      machinePlateRate: (initialData && initialData.machineId === machineId && initialData.machinePlateRate !== undefined) ? initialData.machinePlateRate : selectedMachineObj?.plateCost,
      machinePrintRate: (initialData && initialData.machineId === machineId && initialData.machinePrintRate !== undefined) ? initialData.machinePrintRate : selectedMachineObj?.printChargePer1000,
      machineGripperSize: (initialData && initialData.machineId === machineId && initialData.machineGripperSize !== undefined) ? initialData.machineGripperSize : selectedMachineObj?.gripperMargin,
      machineColorCapacity: (initialData && initialData.machineId === machineId && initialData.machineColorCapacity !== undefined) ? initialData.machineColorCapacity : selectedMachineObj?.numColors,
      fileAccessories,
      layoutData,
      finishingOptions: finishingItems.map(i => i.name),
      finishingItems: finishingItems,

      // Calculated Costs & Overrides (Printopia ERP Business Rules)
      ups: Number(calculations.ups),
      cuttingFactor: calculations.cuttingFactor,
      customCuttingFactor: customCuttingFactor === '' ? undefined : Number(customCuttingFactor),
      machineImpressions: calculations.machineImpressions,
      requiredParentSheets: calculations.requiredParentSheets,
      finalParentSheets: calculations.finalParentSheets,
      paperCost: calculations.paperCost,
      printingCost: calculations.printingCost,
      plateCost: calculations.plateCost,
      finishingCost: calculations.finishingCost,
      otherCharges: calculations.otherCharges,
      productionCost: calculations.productionCost,
      profitPercentage: profitPercentage,
      profitAmount: calculations.profitAmount,
      grandTotal: calculations.grandTotal,
      ratePerPiece: calculations.ratePerPiece,

      samePlateForFrontAndBack: samePlateForFrontAndBack,
      manualPlateQty: manualPlateQty === '' ? undefined : Number(manualPlateQty),
      plateRateOverride: plateRateOverride === '' ? undefined : Number(plateRateOverride),
      printingRateOverride: printingRateOverride === '' ? undefined : Number(printingRateOverride),
      designCharges: designCharges,
      packagingCharges: packagingCharges,
      transportCharges: transportCharges,
      miscCharges: miscCharges
    };

    const validationErrors = validateEstimateJob(jobData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Scroll to top or show alert
      const firstError = Object.keys(validationErrors)[0];
      const element = document.getElementById(`form-field-${firstError}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setErrors({});
    await onSubmit(jobData);
  };

  // --- FILTERED PAPERS & FIELDS (Category -> Brand -> GSM -> Parent Sheet) ---
  const filteredPapers = useMemo(() => {
    return paperCategoryId
      ? papers.filter((p) => p.categoryId === paperCategoryId && p.status === 'Active')
      : [];
  }, [papers, paperCategoryId]);

  const availableBrands = useMemo(() => {
    return [];
  }, []);

  const filteredGSMs = useMemo(() => {
    if (!paperCategoryId) return [];
    return allGSMs;
  }, [allGSMs, paperCategoryId]);

  const selectedCategoryObj = useMemo(() => {
    return paperCategories.find((c) => c.id === paperCategoryId);
  }, [paperCategories, paperCategoryId]);

  const filteredSheets = useMemo(() => {
    if (!paperCategoryId) return [];
    const catNameOrCode = selectedCategoryObj ? (selectedCategoryObj.name || selectedCategoryObj.code) : '';
    return allSheets.filter((s) => isSheetMappedToCategory(s, catNameOrCode));
  }, [allSheets, paperCategoryId, selectedCategoryObj]);

  // Find unique paper object based on category, GSM, and parent sheet
  const selectedPaperObj = useMemo(() => {
    if (!paperCategoryId || !gsmId || !parentSheetId) return undefined;
    return papers.find((p) =>
      p.categoryId === paperCategoryId &&
      p.status === 'Active' &&
      (p.gsmId === gsmId || p.supportedGSMIds?.includes(gsmId)) &&
      (p.parentSheetId === parentSheetId || p.supportedSheetIds?.includes(parentSheetId))
    );
  }, [papers, gsmId, parentSheetId, paperCategoryId]);

  // Automatically load the rate and set the paper ID when full specifications are selected
  useEffect(() => {
    if (selectedPaperObj) {
      setPaperId(selectedPaperObj.id);
      setPaperBrand(selectedPaperObj.brand || '');
      setPaperRateOverride(selectedPaperObj.rate !== undefined ? selectedPaperObj.rate : 0);
    } else {
      setPaperId('');
      setPaperBrand('');
      setPaperRateOverride('');
    }
  }, [selectedPaperObj]);

  const selectedProdObj = products.find((p) => p.id === productId);

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      {Object.keys(errors).length > 0 && (
        <MuiPaper
          variant="outlined"
          sx={{
            p: 2,
            mb: 3,
            borderColor: 'error.main',
            bgcolor: 'error.lighter',
            borderRadius: 3,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5
          }}
        >
          <ErrorIcon color="error" sx={{ mt: 0.2 }} />
          <Box>
            <Typography variant="subtitle2" color="error.main" sx={{ fontWeight: 800 }}>
              Form Validation Failed
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please resolve the {Object.keys(errors).length} highlight error(s) below before submitting.
            </Typography>
          </Box>
        </MuiPaper>
      )}

      <Stack spacing={4}>
        {/* Section A: Job Information */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DocIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Section A: Job Information
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Job Info */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  disabled
                  label="Estimate Number"
                  value={initialData?.estimateNumber || 'Auto-Generated (EST-YYYY-XXXX)'}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Chip label="Auto" size="small" color="primary" variant="outlined" sx={{ height: 20 }} />
                        </InputAdornment>
                      )
                    }
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Estimate Date *"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={estimateDate}
                  onChange={(e) => setEstimateDate(e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }} id="form-field-customerId">
                <TextField
                  select
                  fullWidth
                  label="Select Customer *"
                  value={customerId}
                  onChange={(e) => {
                    if (e.target.value === 'NEW') {
                      setQuickCreateOpen(true);
                      return;
                    }
                    setCustomerId(e.target.value);
                    const cust = customers.find(c => c.id === e.target.value);
                    if (cust && cust.salesExecutive) {
                      setSalesExecutive(cust.salesExecutive);
                    }
                  }}
                  error={!!errors.customerId}
                  helperText={errors.customerId}
                >
                  <MenuItem value="">-- Select Registered Customer --</MenuItem>
                  <MenuItem value="NEW" sx={{ fontWeight: 'bold', color: 'primary.main' }}>+ New Customer</MenuItem>
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.companyName} ({c.customerCode})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  label="Sales Executive"
                  value={salesExecutive}
                  onChange={(e) => setSalesExecutive(e.target.value)}
                >
                  <MenuItem value="">-- Select Sales Executive --</MenuItem>
                  {SALES_EXECUTIVES.map((exec) => (
                    <MenuItem key={exec} value={exec}>
                      {exec}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 12, md: 4 }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ fontSize: '0.75rem', fontWeight: 'bold', mb: 0.5 }}>
                    Job Priority *
                  </FormLabel>
                  <RadioGroup
                    row
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityType)}
                  >
                    <FormControlLabel value="Normal" control={<Radio size="small" />} label="Normal" />
                    <FormControlLabel
                      value="Urgent"
                      control={<Radio size="small" color="warning" />}
                      label={<Typography variant="body2" sx={{ color: 'warning.dark', fontWeight: 600 }}>Urgent</Typography>}
                    />
                    <FormControlLabel
                      value="Very Urgent"
                      control={<Radio size="small" color="error" />}
                      label={<Typography variant="body2" sx={{ color: 'error.main', fontWeight: 700 }}>Very Urgent</Typography>}
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>

              {/* Product Info within Job Information */}
              <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                <Divider sx={{ mb: 3 }} />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }} id="form-field-productId">
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Autocomplete
                    id="product-select"
                    fullWidth
                    options={products}
                    noOptionsText="No Product Found. Please create Product in Product Master."
                    getOptionLabel={(option) => option.productName || ''}
                    value={products.find((p) => p.id === productId) || null}
                    onChange={(event, newValue) => {
                      handleProductChange(newValue ? newValue.id : '');
                    }}
                    onOpen={refreshProducts}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Product Name *"
                        error={!!errors.productId || !!productErrorMessage}
                        helperText={productErrorMessage || errors.productId || "Search and select an active product template"}
                      />
                    )}
                  />
                  <Button
                    variant="outlined"
                    color="primary"
                    sx={{ height: 56, minWidth: 'auto', px: 2, whiteSpace: 'nowrap' }}
                    onClick={() => setProductQuickCreateOpen(true)}
                  >
                    ➕ New Product
                  </Button>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="Product Category"
                  value={productCategoryName}
                  onChange={(e) => setProductCategoryName(e.target.value)}
                  placeholder="e.g. Hospital Stationery"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="Product Code"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="e.g. PRD-HOS-RX"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  label="Product Type"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  placeholder="e.g. Both Side"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 12, md: 8 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={1}
                  label="Product Description (Optional)"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Production directives and description"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Section B: Quantity */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <QuantityIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Section B: Quantity
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, sm: 4 }} id="form-field-orderQuantity">
                <TextField
                  fullWidth
                  type="number"
                  label="Order Quantity *"
                  placeholder="e.g. 5000"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value === '' ? '' : Math.abs(parseInt(e.target.value, 10)))}
                  error={!!errors.orderQuantity}
                  helperText={errors.orderQuantity}
                  slotProps={{ input: { inputProps: { min: 1 } } }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Extra Quantity for Spoilage / Buffer"
                  placeholder="e.g. 100"
                  value={extraQuantity}
                  onChange={(e) => setExtraQuantity(e.target.value === '' ? '' : Math.abs(parseInt(e.target.value, 10)))}
                  slotProps={{ input: { inputProps: { min: 0 } } }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  disabled
                  label="Final Run Quantity"
                  value={finalQuantity}
                  slotProps={{
                    input: {
                      readOnly: true,
                      style: { fontWeight: 'bold', color: '#1e293b' },
                      endAdornment: (
                        <InputAdornment position="end">
                          <Chip label="Total Sheets/Prints" size="small" variant="outlined" color="primary" sx={{ height: 20 }} />
                        </InputAdornment>
                      )
                    }
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Section C: Product Size */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SizeIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Section C: Product Size
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Unit:</Typography>
              <Chip label="Inch (in)" clickable color={sizeUnit === 'inch' ? 'primary' : 'default'} onClick={() => handleUnitChange('inch')} size="small" />
              <Chip label="MM" clickable color={sizeUnit === 'mm' ? 'primary' : 'default'} onClick={() => handleUnitChange('mm')} size="small" />
            </Box>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }} sx={{ borderLeft: '3px solid', borderColor: 'primary.main', pl: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Finished Size *</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }} id="form-field-finishedWidth">
                    <TextField fullWidth type="number" label={`Finished Width (${sizeUnit}) *`} value={finishedWidth} onChange={(e) => setFinishedWidth(e.target.value === '' ? '' : parseFloat(e.target.value))} error={!!errors.finishedWidth} helperText={errors.finishedWidth} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} id="form-field-finishedHeight">
                    <TextField fullWidth type="number" label={`Finished Height (${sizeUnit}) *`} value={finishedHeight} onChange={(e) => setFinishedHeight(e.target.value === '' ? '' : parseFloat(e.target.value))} error={!!errors.finishedHeight} helperText={errors.finishedHeight} />
                  </Grid>
                </Grid>
              </Grid>

              <Grid size={{ xs: 12 }} sx={{ borderLeft: '3px solid', borderColor: 'secondary.main', pl: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Open Size</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth type="number" label={`Open Width (${sizeUnit})`} value={openWidth} onChange={(e) => setOpenWidth(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth type="number" label={`Open Height (${sizeUnit})`} value={openHeight} onChange={(e) => setOpenHeight(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Section D: Printing */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PrintIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Section D: Printing
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth type="number" label="Front Color" value={frontColor} onChange={(e) => setFrontColor(Math.max(1, parseInt(e.target.value, 10) || 1))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth type="number" label="Back Color" value={backColor} onChange={(e) => setBackColor(Math.max(1, parseInt(e.target.value, 10) || 1))} disabled={isEnvelope || printingType === 'Single Side'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField select fullWidth label="Printing Type" value={printingType} onChange={(e) => setPrintingType(e.target.value as PrintingType)} disabled={isEnvelope}>
                  <MenuItem value="Single Side">Single Side</MenuItem>
                  <MenuItem value="Both Side" disabled={isEnvelope}>Both Side</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField select fullWidth label="Printing Process" value={printingProcess} onChange={(e) => setPrintingProcess(e.target.value as PrintingProcess)} disabled={isEnvelope || printingType === 'Single Side'}>
                  <MenuItem value="Sheetwise">Sheetwise</MenuItem>
                  <MenuItem value="Work & Turn" disabled={isEnvelope || printingType === 'Single Side'}>Work & Turn</MenuItem>
                  <MenuItem value="Work & Tumble" disabled={isEnvelope || printingType === 'Single Side'}>Work & Tumble</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Printing Rate (Per 1000 Impressions) *"
                  value={printingRateOverride}
                  onChange={(e) => setPrintingRateOverride(e.target.value === '' ? '' : Number(e.target.value))}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Section E: Paper */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PaperIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Section E: Paper
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }} id="form-field-paperCategoryId">
                <TextField select fullWidth label="Paper Type *" value={paperCategoryId} onChange={(e) => setPaperCategoryId(e.target.value)} error={!!errors.paperCategoryId} helperText={errors.paperCategoryId}>
                  <MenuItem value="">-- Select Paper Type --</MenuItem>
                  {paperCategories.map((cat) => <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }} id="form-field-gsmId">
                <TextField select fullWidth label="GSM *" value={gsmId} onChange={(e) => setGsmId(e.target.value)} disabled={!paperCategoryId} error={!!errors.gsmId} helperText={errors.gsmId}>
                  <MenuItem value="">-- Select GSM --</MenuItem>
                  {filteredGSMs.map((g) => <MenuItem key={g.id} value={g.id}>{g.gsmValue} GSM</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }} id="form-field-parentSheetId">
                <TextField select fullWidth label="Parent Sheet *" value={parentSheetId} onChange={(e) => handleParentSheetChange(e.target.value)} disabled={!paperCategoryId} error={!!errors.parentSheetId} helperText={errors.parentSheetId}>
                  <MenuItem value="">-- Select Parent Sheet --</MenuItem>
                  {filteredSheets.map((s) => <MenuItem key={s.id} value={s.id}>{s.name} ({s.width}×{s.height} {s.unit})</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }} id="form-field-paperRateOverride">
                <TextField
                  fullWidth
                  type="number"
                  label="Paper Rate (Per Sheet) *"
                  value={paperRateOverride}
                  onChange={(e) => setPaperRateOverride(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={!parentSheetId}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Section F: Machine */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <MachineIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Section F: Machine
              </Typography>
            </Box>
            <RadioGroup row value={machineSelectionMode} onChange={(e) => setMachineSelectionMode(e.target.value as MachineSelectionType)}>
              <FormControlLabel value="Auto" control={<Radio size="small" />} label="Auto" />
              <FormControlLabel value="Manual" control={<Radio size="small" />} label="Manual" />
            </RadioGroup>
          </Box>
          <CardContent sx={{ p: 3 }} id="form-field-machineId">
            {machineSelectionMode === 'Auto' ? (
              <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 3, border: '1px dashed', borderColor: 'primary.light' }}>
                <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 800 }}>Recommended: {recommendedMachine?.machineName || 'None'}</Typography>
              </Box>
            ) : (
              <TextField 
                select 
                fullWidth 
                label="Select Machine *" 
                value={machineId} 
                onChange={(e) => setMachineId(e.target.value)}
                error={!!errors.machineId}
                helperText={errors.machineId}
              >
                <MenuItem value="">-- Select Machine --</MenuItem>
                {machines.map((m) => <MenuItem key={m.id} value={m.id}>{m.machineName}</MenuItem>)}
              </TextField>
            )}
            {machineSelectionMode === 'Auto' && errors.machineId && (
              <FormHelperText error sx={{ mt: 1, ml: 1 }}>{errors.machineId}</FormHelperText>
            )}
          </CardContent>
        </Card>

        {/* Section G: Layout (UPS) & Cutting */}
        <Card variant="outlined" sx={{ borderRadius: 3, border: '1px solid', borderColor: 'primary.light' }}>
          <Box sx={{ p: 2.5, bgcolor: 'rgba(37, 99, 235, 0.04)', borderBottom: '1px solid', borderColor: 'primary.light', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AutoIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.dark' }}>
              Section G: Layout & Cutting Pattern
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            {intelligenceError && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{intelligenceError}</Typography>
              </Alert>
            )}

            {/* UPS Analysis Information Grid */}
            <Box sx={{ mb: 3, p: 2.5, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>📐</span> UPS Layout Analysis
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600, mb: 0.5 }}>
                      Normal Layout UPS
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      {upsCalculations.normalUps}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600, mb: 0.5 }}>
                      Rotated Layout UPS
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      {upsCalculations.rotatedUps}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box sx={{ p: 1.5, bgcolor: 'primary.lighter', borderRadius: 1.5, border: '1px solid', borderColor: 'primary.light', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'primary.dark', display: 'block', fontWeight: 700, mb: 0.5 }}>
                      Suggested UPS
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>
                      {upsCalculations.suggestedUps}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box sx={{ p: 1.5, bgcolor: isUpsManuallyEdited ? 'warning.lighter' : 'success.lighter', borderRadius: 1.5, border: '1px solid', borderColor: isUpsManuallyEdited ? 'warning.light' : 'success.light', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: isUpsManuallyEdited ? 'warning.dark' : 'success.dark', display: 'block', fontWeight: 700, mb: 0.5 }}>
                      Status
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isUpsManuallyEdited ? 'warning.main' : 'success.main', lineHeight: 1.4 }}>
                      {isUpsManuallyEdited ? 'Manual Override' : 'Auto-Calculated'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }} id="form-field-ups">
                <TextField
                  fullWidth
                  type="number"
                  label="Final UPS *"
                  value={ups}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Math.max(1, parseFloat(e.target.value));
                    setUps(val);
                    setIsUpsManuallyEdited(true);
                  }}
                  onBlur={() => {
                    if (typeof ups === 'number') {
                      setUps(Math.floor(ups));
                    }
                  }}
                  error={!!errors.ups}
                  helperText={errors.ups || (isUpsManuallyEdited ? "Manual override active" : "Using auto-suggested layout")}
                  slotProps={{
                    input: {
                      endAdornment: isUpsManuallyEdited && (
                        <InputAdornment position="end">
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => {
                              setIsUpsManuallyEdited(false);
                              if (upsCalculations.suggestedUps > 0) {
                                setUps(upsCalculations.suggestedUps);
                              }
                            }}
                            sx={{ height: 28, textTransform: 'none', fontSize: '0.72rem', fontWeight: 'bold' }}
                          >
                            Use Suggested
                          </Button>
                        </InputAdornment>
                      )
                    }
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  label="Cutting Pattern *"
                  value={cuttingFactor}
                  onChange={(e) => setCuttingFactor(e.target.value)}
                >
                  <MenuItem value="1:1">1:1 (No Cutting)</MenuItem>
                  <MenuItem value="1:2">1:2 (Half)</MenuItem>
                  <MenuItem value="1:3">1:3 (Third)</MenuItem>
                  <MenuItem value="1:4">1:4 (Quarter)</MenuItem>
                  <MenuItem value="Custom">Custom</MenuItem>
                </TextField>
              </Grid>
              {cuttingFactor === 'Custom' && (
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Custom Factor *"
                    value={customCuttingFactor}
                    onChange={(e) => setCustomCuttingFactor(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value)))}
                  />
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  disabled
                  label="Required Parent Sheets"
                  value={calculations.requiredParentSheets.toLocaleString()}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  disabled
                  label="Final Parent Sheets"
                  value={calculations.finalParentSheets.toLocaleString()}
                  helperText={`Incl. ${paperWastageSheets} wastage`}
                />
              </Grid>
            </Grid>

            {layoutParams && (
              <UpsLayoutPreview
                layout={layoutData}
                onLayoutChange={setLayoutData}
                productOpenWidth={layoutParams.productWidth}
                productOpenHeight={layoutParams.productHeight}
                parentWidth={layoutParams.parentWidth}
                parentHeight={layoutParams.parentHeight}
                machineWidth={layoutParams.machineWidth}
                machineHeight={layoutParams.machineHeight}
                gripperMargin={layoutParams.gripperMargin}
                sideMargin={layoutParams.sideMargin}
                tailMargin={layoutParams.tailMargin}
                cuttingMethod={layoutParams.cuttingMethod}
                numMachineSheets={layoutParams.numMachineSheets}
                printingMethod={layoutParams.printingMethod}
              />
            )}
          </CardContent>
        </Card>

        {/* Section H: Impression */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PrintIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Section H: Machine Impression
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField 
                  fullWidth 
                  disabled 
                  label="Machine Sheet Quantity" 
                  value={calculations.machineSheetQuantity.toLocaleString()} 
                  helperText={`Final Sheets (${calculations.finalParentSheets}) × Factor`} 
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField 
                  fullWidth 
                  disabled 
                  label="Front Impressions" 
                  value={calculations.frontImpressions.toLocaleString()} 
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField 
                  fullWidth 
                  disabled 
                  label="Back Impressions" 
                  value={calculations.backImpressions.toLocaleString()} 
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField 
                  fullWidth 
                  disabled 
                  label="Total Impressions" 
                  value={calculations.totalImpressions.toLocaleString()} 
                  helperText={`${calculations.printingPasses} Printing Pass(es)`} 
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Section I: Plate */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AutoIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Section I: Plate
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControlLabel control={<Checkbox checked={samePlateForFrontAndBack} onChange={(e) => setSamePlateForFrontAndBack(e.target.checked)} />} label="Same Plate F&B" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth disabled label="Plate Set Method" value={calculations.plateSetMethod} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <TextField fullWidth type="number" label="Manual Plate Qty" value={manualPlateQty} onChange={(e) => setManualPlateQty(e.target.value)} placeholder={`Sys: ${calculations.systemPlateQty}`} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <TextField fullWidth type="number" label="Plate Rate *" value={plateRateOverride} onChange={(e) => setPlateRateOverride(e.target.value === '' ? '' : Number(e.target.value))} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <TextField fullWidth disabled label="Plate Cost" value={`₹ ${calculations.plateCost.toLocaleString()}`} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Section J: Manual Wastage */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <QuantityIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Section J: Manual Wastage
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField 
                  fullWidth 
                  type="number" 
                  label="Machine Wastage (Sheets) *" 
                  value={paperWastageSheets} 
                  onChange={(e) => {
                    let val = e.target.value === '' ? 0 : Number(e.target.value);
                    const maxWastage = selectedMachineObj?.maxMakeReadyWastage || 15;
                    if (val > maxWastage) val = maxWastage;
                    if (val < 0) val = 0;
                    setPaperWastageSheets(val);
                  }} 
                  helperText={`Default: ${selectedMachineObj?.makeReadyWastage || 10}, Max: ${selectedMachineObj?.maxMakeReadyWastage || 15}`}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Section K: Finishing */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AutoIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Section K: Finishing
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: 'text.secondary' }}>Add Finishing Process</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {FINISHING_CATALOG.map((f) => {
                  const isAdded = finishingItems.some(i => i.name === f.name);
                  return (
                    <Chip
                      key={f.name}
                      label={f.name}
                      onClick={() => isAdded ? null : addFinishingItem(f.name)}
                      color={isAdded ? "primary" : "default"}
                      variant={isAdded ? "filled" : "outlined"}
                      disabled={isAdded}
                      sx={{ borderRadius: 1.5 }}
                    />
                  );
                })}
              </Box>
            </Box>

            {fileAccessoriesVisible && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.100' }}>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth size="small" error={!!errors.fileAccessories} required={fileAccessoriesMandatory}>
                      <FormLabel sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>File Accessories</FormLabel>
                      <TextField
                        select
                        size="small"
                        value={fileAccessories}
                        onChange={(e) => setFileAccessories(e.target.value as FileAccessoriesType)}
                        fullWidth
                        sx={{ bgcolor: 'white' }}
                      >
                        <MenuItem value="None">None</MenuItem>
                        <MenuItem value="Clip">Clip</MenuItem>
                        <MenuItem value="Pocket">Pocket</MenuItem>
                        <MenuItem value="Clip + Pocket">Clip + Pocket</MenuItem>
                      </TextField>
                      {errors.fileAccessories && <FormHelperText>{errors.fileAccessories}</FormHelperText>}
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    {fileAccessories !== 'None' && (
                      <Box sx={{ mt: 2.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <InfoIcon sx={{ fontSize: 16 }} />
                          {calculations.fileAccCostConfigured ? (
                            <span>Automated Costing Applied: <strong>₹ {(calculations.finishingCost - finishingItems.reduce((s, i) => s + i.total, 0)).toFixed(2)}</strong></span>
                          ) : (
                            <span style={{ color: '#d32f2f' }}>Cost not configured. (₹ 0.00 applied)</span>
                          )}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </Box>
            )}

            <TableContainer component={MuiPaper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Process</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Rate (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Total (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {finishingItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No finishing processes added yet. Select from the list above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    finishingItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateFinishingItem(index, 'quantity', Number(e.target.value) || 0)}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateFinishingItem(index, 'rate', Number(e.target.value) || 0)}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.total}
                            onChange={(e) => updateFinishingItem(index, 'total', Number(e.target.value) || 0)}
                            sx={{ width: 120 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button color="error" size="small" onClick={() => removeFinishingItem(index)}>Remove</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {finishingItems.length > 0 && (
                    <TableRow sx={{ bgcolor: 'rgba(25, 118, 210, 0.04)' }}>
                      <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>Total Finishing Cost:</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>₹ {calculations.finishingCost.toLocaleString()}</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Section L: Other Charges */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DocIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Section L: Other Charges
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth type="number" label="Design" value={designCharges} onChange={(e) => setDesignCharges(Number(e.target.value) || 0)} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth type="number" label="Packaging" value={packagingCharges} onChange={(e) => setPackagingCharges(Number(e.target.value) || 0)} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth type="number" label="Transport" value={transportCharges} onChange={(e) => setTransportCharges(Number(e.target.value) || 0)} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth type="number" label="Misc" value={miscCharges} onChange={(e) => setMiscCharges(Number(e.target.value) || 0)} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth type="number" label="Profit %" value={profitPercentage} onChange={(e) => setProfitPercentage(Number(e.target.value) || 0)} slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }} /></Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Section M: Estimate Summary */}
        <Card variant="outlined" sx={{ borderRadius: 3, border: '2px solid', borderColor: 'primary.main' }}>
          <Box sx={{ p: 2.5, bgcolor: 'primary.lighter', borderBottom: '1px solid', borderColor: 'primary.light', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DocIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.dark' }}>
              Section M: Estimate Summary
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, textTransform: 'uppercase', color: 'text.secondary' }}>Technical Summary</Typography>
              <Grid container spacing={1}>
                {[
                  { label: 'Selected Machine', value: selectedMachineObj?.machineName || 'N/A' },
                  { label: 'Machine Sheet Size', value: selectedMachineObj ? `${selectedMachineObj.maxSheetWidth}×${selectedMachineObj.maxSheetHeight} mm` : 'N/A' },
                  { label: 'Gripper Size', value: selectedMachineObj ? `${selectedMachineObj.gripperMargin} mm` : 'N/A' },
                  { label: 'Plate Rate', value: `₹ ${calculations.plateRate}` },
                  { label: 'Printing Rate / 1000', value: `₹ ${calculations.printingRate}` },
                  { label: 'Plate Count', value: calculations.finalPlateQty },
                  { label: 'Plate Cost', value: `₹ ${calculations.plateCost.toLocaleString()}` },
                  { label: 'Total Impressions', value: calculations.totalImpressions.toLocaleString() },
                  { label: 'Printing Cost', value: `₹ ${calculations.printingCost.toLocaleString()}` },
                  { label: 'UPS', value: calculations.ups },
                  { label: 'Final Parent Sheets', value: calculations.finalParentSheets },
                  { label: 'Cutting Factor', value: calculations.cuttingFactor }
                ].map((stat, i) => (
                  <Grid size={{ xs: 6, sm: 3, md: 2 }} key={i}>
                    <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block' }}>{stat.label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{stat.value}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Grid container spacing={2}>
              {[
                { label: 'Paper Cost', value: calculations.paperCost },
                { label: 'Printing Cost', value: calculations.printingCost },
                { label: 'Plate Cost', value: calculations.plateCost },
                { label: 'Finishing Cost', value: calculations.finishingCost },
                { label: 'Other Charges', value: calculations.otherCharges },
                { label: 'Production Cost', value: calculations.productionCost, highlight: true },
                { label: 'Profit Amount', value: calculations.profitAmount },
                { label: 'Grand Total', value: calculations.grandTotal, primary: true },
                { label: 'Rate Per Piece', value: calculations.ratePerPiece, rate: true },
              ].map((item, idx) => (
                <Grid size={{ xs: 12, sm: 4 }} key={idx}>
                  <Box sx={{ p: 2, bgcolor: item.primary ? 'primary.main' : item.highlight ? 'action.hover' : 'background.paper', color: item.primary ? 'white' : 'text.primary', borderRadius: 2, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', textTransform: 'uppercase', opacity: 0.8 }}>{item.label}</Typography>
                    <Typography variant={item.primary ? 'h5' : 'h6'} sx={{ fontWeight: 900 }}>₹ {item.value.toLocaleString(undefined, { minimumFractionDigits: item.rate ? 4 : 2, maximumFractionDigits: item.rate ? 4 : 2 })}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Remarks Section */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Engineering Remarks / Special Instructions"
              placeholder="Enter instructions regarding packing, transport, grain direction, or custom notes."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pb: 4 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={onCancel}
            sx={{ borderRadius: '8px', px: 3, py: 1 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            startIcon={<CheckIcon />}
            sx={{ borderRadius: '8px', px: 4, py: 1, fontWeight: 'bold' }}
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Estimate Job' : 'Register Estimate Job'}
          </Button>
        </Box>
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
      </Stack>
    </Box>
  );
}
