import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, format, differenceInDays } from 'date-fns';
import { QuotationApiService } from '../features/quotation/services/api';
import { BillingApiService } from '../features/billing/api';
import { ProductionApiService } from '../features/production/services/api';
import { ProductionTrackingApiService } from '../features/production/services/productionTrackingApi';
import { InventoryApiService } from '../features/inventory/services/api';
import { PurchaseApiService } from '../features/purchase/services/api';
import { PIApiService } from '../features/proforma-invoice/services/api';
import { MachineApiService } from '../features/machines/services/api';
import { GSTInvoice, PaymentReceipt, CreditNote, CustomerOutstanding, AgeingBucketSummary } from '../features/billing/types';
import { QuotationHeader } from '../features/quotation/types';
import { ProformaInvoice } from '../features/proforma-invoice/types';
import { ProductionOrder } from '../features/production/types';

export interface SalesOverviewPoint {
  label: string; // "Mon", "Jan", etc.
  sales: number; // Invoice total
  receipts: number; // Payment received
  outstanding: number; // Net unpaid balance of invoices generated in this period
}

export interface DashboardMetrics {
  // Summary Stats
  todayQuotationsCount: number;
  todayConfirmedOrdersCount: number;
  todayConfirmedOrdersValue: number;
  todaySalesValue: number;
  thisMonthSalesValue: number;
  thisFinancialYearSalesValue: number;
  totalPaymentReceived: number;
  totalCustomerOutstanding: number;
  activeJobsCount: number;
  pendingDispatchCount: number;
  lowStockCount: number;
  expensesValue: number;
  supplierBalanceValue: number;
  cashReceiptValue: number;
  onlineReceiptValue: number;

  // Secondary counts
  pendingQuotationsCount: number;
  purchasePendingCount: number;
  qcPendingCount: number;
  reworkPendingCount: number;

  // Chart Data
  salesOverviewData: SalesOverviewPoint[];
  salesPeriodLabel: string;

  // Quotation Conversion
  conversionStats: {
    draft: number;
    sent: number;
    confirmed: number;
    rejected: number;
    convertedToPI: number;
    conversionRate: number;
  };

  // Production Pipeline
  pipelineStages: {
    approvedPiAwaitingPO: number;
    productionOrderCreated: number;
    paperIssuePending: number;
    plateIssuePending: number;
    machineQueuePending: number;
    inProduction: number;
    qcPending: number;
    reworkPending: number;
    readyForDispatch: number;
    dispatched: number;
  };

  // Urgent / Needs Attention
  urgentJobs: Array<{
    id: string;
    productName: string;
    poNumber: string;
    customerName: string;
    priority: string;
    status: string;
    deliveryDate: string;
  }>;

  // Machine Status
  machines: Array<{
    id: string;
    name: string;
    size: string;
    status: 'Running' | 'Idle' | 'Maintenance' | 'Offline';
    currentJob: string;
    queueCount: number;
    plannedStart: string;
    estimatedCompletion: string;
    utilization: string; // e.g. "Not enough data"
  }>;

  // Inventory Alerts
  inventoryAlerts: Array<{
    id: string;
    name: string;
    category: string;
    available: number;
    reorderLevel: number;
    unit: string;
    status: 'Out of Stock' | 'Critical' | 'Low' | 'Sufficient';
  }>;

  // Ageing Buckets
  ageingSummary: AgeingBucketSummary;

  // Recent Activities
  recentActivities: Array<{
    id: string;
    timestamp: string;
    user: string;
    action: string;
    module: string;
    details: string;
  }>;
}

export class DashboardService {
  
  public static async getMetrics(
    role: string, 
    period: '7days' | 'thismonth' | 'lastmonth' | 'thisfy' | 'custom',
    customDateRange?: { start: Date; end: Date }
  ): Promise<DashboardMetrics> {
    
    // Load all data parallelly to avoid waterfalls
    const [
      quotationList,
      invoiceList,
      receiptList,
      prodOrderList,
      jobList,
      inventoryList,
      poList,
      creditNoteList,
      machineList,
      piList
    ] = await Promise.all([
      QuotationApiService.getQuotations(),
      BillingApiService.getInvoices(),
      BillingApiService.getReceipts(),
      ProductionApiService.getOrders(),
      ProductionTrackingApiService.getJobs(),
      InventoryApiService.getInventoryItems(),
      PurchaseApiService.getPurchaseOrders(),
      BillingApiService.getCreditNotes(),
      MachineApiService.getMachines(),
      PIApiService.getInvoices()
    ]);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // --- SUMMARY STATISTICS ---

    // 1. Today's Quotations
    const todayQuotations = quotationList.filter(q => {
      const qDate = q.date ? q.date.split('T')[0] : '';
      return qDate === todayStr;
    });
    const todayQuotationsCount = todayQuotations.length;

    // 2. Today's Confirmed Orders & Value
    // A confirmed order is either an Approved PI approved today, or an Accepted/Confirmed quotation today (not yet in PI)
    const approvedPIsToday = piList.filter(pi => {
      const isApproved = ['Approved', 'Partially Paid', 'Fully Paid'].includes(pi.status);
      if (!isApproved) return false;
      const piDate = pi.date ? pi.date.split('T')[0] : '';
      const piCreatedAt = pi.createdAt ? pi.createdAt.split('T')[0] : '';
      
      // Also check timeline for approval timestamp
      const approvedTimeline = pi.timeline?.some(evt => 
        (evt.stage.includes('Approved') || evt.stage.includes('Status: Approved')) && 
        evt.date === todayStr
      );
      
      return piDate === todayStr || piCreatedAt === todayStr || approvedTimeline;
    });

    const acceptedQuotesToday = quotationList.filter(q => {
      if (q.status !== 'Accepted') return false;
      const qDate = q.date ? q.date.split('T')[0] : '';
      const qUpdatedAt = q.updatedAt ? q.updatedAt.split('T')[0] : '';
      
      const isToday = qDate === todayStr || qUpdatedAt === todayStr;
      if (!isToday) return false;

      // Avoid double counting: check if converted to PI
      const isConverted = piList.some(pi => pi.quotationId === q.id || pi.quotationNumber === q.quotationNumber);
      return !isConverted;
    });

    const todayConfirmedOrdersCount = approvedPIsToday.length + acceptedQuotesToday.length;
    
    // Value priority: Approved PI grandTotal, then Confirmed Quotation sum of options
    const piTodayVal = approvedPIsToday.reduce((sum, pi) => sum + (pi.grandTotal || 0), 0);
    const quoteTodayVal = acceptedQuotesToday.reduce((sum, q) => {
      const qVal = q.items?.reduce((iSum, item) => {
        return iSum + (item.options?.reduce((oSum, opt) => oSum + (opt.total || 0), 0) || 0);
      }, 0) || 0;
      return sum + qVal;
    }, 0);
    const todayConfirmedOrdersValue = piTodayVal + quoteTodayVal;

    // 3. Invoice Sales
    // Taxable amount + Applicable GST = Invoice Grand Total
    const getInvoiceValue = (inv: GSTInvoice) => {
      return inv.grandTotal || (inv.taxableAmount || 0) + (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0);
    };

    const todayInvoices = invoiceList.filter(inv => {
      const invDate = inv.invoiceDate ? inv.invoiceDate.split('T')[0] : '';
      return invDate === todayStr && inv.status !== 'Cancelled';
    });
    const todaySalesValue = todayInvoices.reduce((sum, inv) => sum + getInvoiceValue(inv), 0);

    const isThisMonth = (dateStr: string) => {
      if (!dateStr) return false;
      const d = parseISO(dateStr);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    };

    const thisMonthInvoices = invoiceList.filter(inv => {
      return isThisMonth(inv.invoiceDate) && inv.status !== 'Cancelled';
    });
    const thisMonthSalesValue = thisMonthInvoices.reduce((sum, inv) => sum + getInvoiceValue(inv), 0);

    const isThisFinancialYear = (dateStr: string) => {
      if (!dateStr) return false;
      const d = parseISO(dateStr);
      const year = d.getFullYear();
      const month = d.getMonth(); // 0-indexed, 3 = April
      
      const todayYear = today.getFullYear();
      const todayMonth = today.getMonth();
      let fyStartYear = todayYear;
      if (todayMonth < 3) {
        fyStartYear = todayYear - 1;
      }
      
      const fyStart = new Date(fyStartYear, 3, 1); // April 1st
      const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59); // March 31st
      return d >= fyStart && d <= fyEnd;
    };

    const thisFyInvoices = invoiceList.filter(inv => {
      return isThisFinancialYear(inv.invoiceDate) && inv.status !== 'Cancelled';
    });
    const thisFinancialYearSalesValue = thisFyInvoices.reduce((sum, inv) => sum + getInvoiceValue(inv), 0);

    // 4. Payment Received (Total allocated amount from receipts, non-cancelled)
    // Avoid double-counting and use the direct receipt paymentDate or receipt's amount field
    const totalPaymentReceived = receiptList.reduce((sum, r) => sum + (r.amount || 0), 0);

    // 5. Total Customer Outstanding
    // Outstanding formula: Total GST Invoice payable amount minus Total allocated Payment Receipt amount minus Credit Note amount
    // Prevent negative outstanding values caused by duplicate payment allocation.
    const activeInvoices = invoiceList.filter(inv => inv.status !== 'Cancelled');
    let totalCustomerOutstanding = 0;

    activeInvoices.forEach(inv => {
      const payable = getInvoiceValue(inv);
      const receiptsForInvoice = receiptList.filter(r => r.invoiceId === inv.id).reduce((sum, r) => sum + (r.amount || 0), 0);
      const creditNotesForInvoice = creditNoteList.filter(cn => cn.invoiceId === inv.id).reduce((sum, cn) => sum + (cn.grandTotal || 0), 0);
      
      const outstanding = Math.max(0, payable - receiptsForInvoice - creditNotesForInvoice);
      totalCustomerOutstanding += outstanding;
    });

    // 6. Active Production Jobs
    // Active jobs are job items (within active POs) whose status is NOT Completed or Cancelled
    const activeJobs = jobList.filter(j => !['Completed', 'Cancelled'].includes(j.status || ''));
    const activeJobsCount = activeJobs.length;

    // 7. Pending Dispatch
    // Pending dispatch mapping: QC completed jobs but not fully dispatched
    const pendingDispatch = jobList.filter(j => j.status === 'Ready for Dispatch');
    const pendingDispatchCount = pendingDispatch.length;

    // 8. Low Stock Items
    // Materials where available Stock <= reorderLevel
    const lowStockItems = inventoryList.filter(item => item.availableStock <= item.reorderLevel);
    const lowStockCount = lowStockItems.length;

    // Expenses, Supplier Balance, Cash Receipt, Online Receipt calculations
    const expensesValue = poList
      .filter(po => ['Received', 'Completed', 'Approved', 'Issued'].includes(po.status))
      .reduce((sum, po) => sum + (po.grandTotal || 0), 0);

    const supplierBalanceValue = poList
      .filter(po => ['Issued', 'Partial Received'].includes(po.status))
      .reduce((sum, po) => sum + (po.grandTotal || 0), 0);

    const cashReceiptValue = receiptList
      .filter(r => r.paymentMode === 'Cash')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const onlineReceiptValue = receiptList
      .filter(r => ['Online', 'Bank Transfer', 'Cheque', 'UPI'].includes(r.paymentMode))
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    // 9. Extra Counts for Accounts & Designer/Production Role compatibility
    const pendingQuotationsCount = quotationList.filter(q => ['Draft', 'Pending', 'Sent'].includes(q.status)).length;
    const purchasePendingCount = poList.filter(po => !['Received', 'Completed', 'Cancelled'].includes(po.status)).length;
    const qcPendingCount = jobList.filter(j => j.status === 'QC').length;
    const reworkPendingCount = jobList.filter(j => j.status === 'Rework Required').length;


    // --- DATE RANGE & CHART DATA GENERATION ---

    let dateRange = { start: subDays(today, 6), end: today };
    let chartPeriod = 'daily';

    if (period === 'thismonth') {
      dateRange = { start: startOfMonth(today), end: endOfMonth(today) };
    } else if (period === 'lastmonth') {
      const prevMonth = subMonths(today, 1);
      dateRange = { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
    } else if (period === 'thisfy') {
      const todayYear = today.getFullYear();
      const todayMonth = today.getMonth();
      let fyStartYear = todayYear;
      if (todayMonth < 3) fyStartYear = todayYear - 1;
      dateRange = { start: new Date(fyStartYear, 3, 1), end: today };
      chartPeriod = 'monthly';
    } else if (period === 'custom' && customDateRange) {
      dateRange = customDateRange;
      const daysDiff = differenceInDays(customDateRange.end, customDateRange.start);
      if (daysDiff > 31) {
        chartPeriod = 'monthly';
      }
    }

    const salesOverviewData: SalesOverviewPoint[] = [];

    if (chartPeriod === 'daily') {
      // Create days interval
      const days: Date[] = [];
      let tempDate = new Date(dateRange.start);
      while (tempDate <= dateRange.end) {
        days.push(new Date(tempDate));
        tempDate.setDate(tempDate.getDate() + 1);
      }

      days.forEach(day => {
        const dateStr = day.toISOString().split('T')[0];
        const dayLabel = format(day, 'dd MMM');

        // GST Invoice Sales on this day
        const daySales = invoiceList
          .filter(inv => inv.invoiceDate === dateStr && inv.status !== 'Cancelled')
          .reduce((sum, inv) => sum + getInvoiceValue(inv), 0);

        // Receipts on this day
        const dayReceipts = receiptList
          .filter(r => r.paymentDate === dateStr)
          .reduce((sum, r) => sum + (r.amount || 0), 0);

        // Outstanding generated on this day
        const dayInvoicesCreated = invoiceList.filter(inv => inv.invoiceDate === dateStr && inv.status !== 'Cancelled');
        let dayOutstanding = 0;
        dayInvoicesCreated.forEach(inv => {
          const payable = getInvoiceValue(inv);
          const receiptsForInv = receiptList.filter(r => r.invoiceId === inv.id).reduce((sum, r) => sum + (r.amount || 0), 0);
          const creditNotesForInv = creditNoteList.filter(cn => cn.invoiceId === inv.id).reduce((sum, cn) => sum + (cn.grandTotal || 0), 0);
          dayOutstanding += Math.max(0, payable - receiptsForInv - creditNotesForInv);
        });

        salesOverviewData.push({
          label: dayLabel,
          sales: daySales,
          receipts: dayReceipts,
          outstanding: dayOutstanding
        });
      });
    } else {
      // Monthly grouping
      const months: { year: number; month: number; label: string }[] = [];
      let tempDate = new Date(dateRange.start);
      while (tempDate <= dateRange.end) {
        const yr = tempDate.getFullYear();
        const mn = tempDate.getMonth();
        const lbl = format(tempDate, 'MMM yy');
        const exists = months.some(m => m.year === yr && m.month === mn);
        if (!exists) {
          months.push({ year: yr, month: mn, label: lbl });
        }
        tempDate.setMonth(tempDate.getMonth() + 1);
      }

      months.forEach(m => {
        // GST Invoice Sales in this month
        const mSales = invoiceList
          .filter(inv => {
            if (!inv.invoiceDate || inv.status === 'Cancelled') return false;
            const d = parseISO(inv.invoiceDate);
            return d.getFullYear() === m.year && d.getMonth() === m.month;
          })
          .reduce((sum, inv) => sum + getInvoiceValue(inv), 0);

        // Receipts in this month
        const mReceipts = receiptList
          .filter(r => {
            if (!r.paymentDate) return false;
            const d = parseISO(r.paymentDate);
            return d.getFullYear() === m.year && d.getMonth() === m.month;
          })
          .reduce((sum, r) => sum + (r.amount || 0), 0);

        // Outstanding generated in this month
        const mInvoicesCreated = invoiceList.filter(inv => {
          if (!inv.invoiceDate || inv.status === 'Cancelled') return false;
          const d = parseISO(inv.invoiceDate);
          return d.getFullYear() === m.year && d.getMonth() === m.month;
        });

        let mOutstanding = 0;
        mInvoicesCreated.forEach(inv => {
          const payable = getInvoiceValue(inv);
          const receiptsForInv = receiptList.filter(r => r.invoiceId === inv.id).reduce((sum, r) => sum + (r.amount || 0), 0);
          const creditNotesForInv = creditNoteList.filter(cn => cn.invoiceId === inv.id).reduce((sum, cn) => sum + (cn.grandTotal || 0), 0);
          mOutstanding += Math.max(0, payable - receiptsForInv - creditNotesForInv);
        });

        salesOverviewData.push({
          label: m.label,
          sales: mSales,
          receipts: mReceipts,
          outstanding: mOutstanding
        });
      });
    }

    const salesPeriodLabel = `${format(dateRange.start, 'dd MMM yyyy')} - ${format(dateRange.end, 'dd MMM yyyy')}`;


    // --- QUOTATION CONVERSION ---
    // Show Draft, Sent, Confirmed (Accepted), Rejected, Converted to PI
    let draftQuotes = 0;
    let sentQuotes = 0;
    let confirmedQuotes = 0;
    let rejectedQuotes = 0;
    let convertedToPIQuotes = 0;

    quotationList.forEach(q => {
      const isConverted = piList.some(pi => pi.quotationId === q.id || pi.quotationNumber === q.quotationNumber);
      const qStatus = q.status as string;
      if (isConverted) {
        convertedToPIQuotes++;
      } else if (qStatus === 'Accepted' || qStatus === 'Approved') {
        confirmedQuotes++;
      } else if (qStatus === 'Rejected') {
        rejectedQuotes++;
      } else if (qStatus === 'Sent' || qStatus === 'Revised') {
        sentQuotes++;
      } else {
        draftQuotes++;
      }
    });

    const totalSentAndActive = sentQuotes + confirmedQuotes + rejectedQuotes + convertedToPIQuotes;
    const conversionRate = totalSentAndActive === 0 ? 0 : Math.round(((confirmedQuotes + convertedToPIQuotes) / totalSentAndActive) * 100);

    const conversionStats = {
      draft: draftQuotes,
      sent: sentQuotes,
      confirmed: confirmedQuotes,
      rejected: rejectedQuotes,
      convertedToPI: convertedToPIQuotes,
      conversionRate
    };


    // --- PRODUCTION PIPELINE ---
    // Stages: Approved PI awaiting Production Order, Production Order created, Paper Issue pending, Plate Issue pending, Machine Queue pending, In Production, QC pending, Rework pending, Ready for Dispatch, Dispatched.
    
    // 1. Approved PI awaiting PO
    const approvedPiAwaitingPO = piList.filter(pi => 
      (pi.status === 'Accepted' || pi.status === 'Production Approved' || pi.status === 'Partially Paid' || pi.status === 'Paid') && !prodOrderList.some(po => po.piId === pi.id || po.piNumber === pi.piNumber)
    ).length;

    // Remaining counts based on Job Items (non-cancelled, non-onhold)
    const validJobs = jobList.filter(j => j.status !== 'Cancelled' && j.status !== 'On Hold');
    
    const productionOrderCreated = validJobs.filter(j => j.status === 'Planning').length;
    const paperIssuePending = validJobs.filter(j => j.status === 'Planning').length; // Initial stage
    const plateIssuePending = validJobs.filter(j => j.status === 'Paper Issued').length;
    const machineQueuePending = validJobs.filter(j => ['Plate Ready', 'Ready for Printing'].includes(j.status || '')).length;
    const inProduction = validJobs.filter(j => ['Printing Started', 'Printing Completed', 'Drying', 'Cutting', 'Finishing', 'Packing'].includes(j.status || '')).length;
    const qcPending = validJobs.filter(j => j.status === 'QC').length;
    const reworkPending = validJobs.filter(j => j.status === 'Rework Required').length;
    const readyForDispatch = validJobs.filter(j => j.status === 'Ready for Dispatch').length;
    const dispatched = validJobs.filter(j => j.status === 'Completed').length;

    const pipelineStages = {
      approvedPiAwaitingPO,
      productionOrderCreated,
      paperIssuePending,
      plateIssuePending,
      machineQueuePending,
      inProduction,
      qcPending,
      reworkPending,
      readyForDispatch,
      dispatched
    };


    // --- URGENT JOBS / NEEDS ATTENTION ---
    const urgentJobs = jobList
      .filter(j => (j.priority === 'Super Urgent' || j.priority === 'Urgent' || j.parentPriority === 'Super Urgent' || j.parentPriority === 'Urgent') && !['Completed', 'Cancelled'].includes(j.status || ''))
      .map(j => ({
        id: j.id,
        productName: j.productName,
        poNumber: j.poNumber || 'N/A',
        customerName: j.customerName || 'N/A',
        priority: j.priority || j.parentPriority || 'Normal',
        status: j.status || 'Planning',
        deliveryDate: j.deliveryDate || 'N/A'
      }))
      .slice(0, 10); // Max 10 urgent jobs


    // --- MACHINE STATUS MAPPING ---
    const getMachineJobs = (mId: string) => {
      return jobList.filter(j => j.assignedMachineId === mId && !['Completed', 'Cancelled'].includes(j.status || ''));
    };

    const machines = machineList.map(m => {
      const activeJobsOnMachine = getMachineJobs(m.id);
      
      // Determine Current Status based on running jobs
      // Running, Idle, Maintenance, Offline
      let mStatus: 'Running' | 'Idle' | 'Maintenance' | 'Offline' = 'Idle';
      const rawStatus = m.status as string;
      if (rawStatus === 'Inactive' || rawStatus === 'inactive') {
        mStatus = 'Offline';
      } else if (activeJobsOnMachine.some(j => ['Printing Started', 'Cutting', 'Finishing'].includes(j.status || ''))) {
        mStatus = 'Running';
      } else if (rawStatus === 'Under Maintenance' || rawStatus === 'maintenance' || rawStatus === 'Maintenance') {
        mStatus = 'Maintenance';
      }

      // Current job name
      const currentRunningJob = activeJobsOnMachine.find(j => ['Printing Started', 'Cutting', 'Finishing'].includes(j.status || '')) || activeJobsOnMachine[0];
      const currentJob = currentRunningJob ? `${currentRunningJob.productName} (PO: ${currentRunningJob.poNumber})` : 'None';

      return {
        id: m.id,
        name: m.machineName,
        size: `${m.maxSheetWidth || 23}x${m.maxSheetHeight || 36} mm`,
        status: mStatus,
        currentJob,
        queueCount: activeJobsOnMachine.length,
        plannedStart: activeJobsOnMachine[0] ? 'Immediate' : 'N/A',
        estimatedCompletion: currentRunningJob ? 'In Progress' : 'N/A',
        utilization: 'Not enough data' // Utilize only when real time tracking exists, otherwise "Not enough data"
      };
    });


    // --- INVENTORY ALERTS ---
    const inventoryAlerts = inventoryList
      .map(item => {
        let status: 'Out of Stock' | 'Critical' | 'Low' | 'Sufficient' = 'Sufficient';
        if (item.availableStock === 0) {
          status = 'Out of Stock';
        } else if (item.availableStock <= item.minimumStock || item.availableStock <= item.reorderLevel * 0.3) {
          status = 'Critical';
        } else if (item.availableStock <= item.reorderLevel) {
          status = 'Low';
        }

        return {
          id: item.id,
          name: item.itemName,
          category: item.materialType,
          available: item.availableStock,
          reorderLevel: item.reorderLevel,
          unit: item.unit || 'SHT',
          status
        };
      })
      .filter(item => item.status !== 'Sufficient')
      .sort((a, b) => {
        const order = { 'Out of Stock': 0, 'Critical': 1, 'Low': 2, 'Sufficient': 3 };
        return order[a.status] - order[b.status];
      });


    // --- AGEING BUCKETS ---
    // Use the real ageing buckets from BillingApiService
    const ageingSummary = await BillingApiService.getAgeingSummary();


    // --- RECENT ACTIVITIES ---
    // Combine logs chronologically
    const activities: Array<{
      id: string;
      timestamp: string;
      user: string;
      action: string;
      module: string;
      details: string;
    }> = [];

    // GST Invoice Audit history
    invoiceList.slice(-15).forEach(inv => {
      inv.auditHistory?.forEach(h => {
        activities.push({
          id: h.id || `act-inv-${Math.random()}`,
          timestamp: h.timestamp,
          user: h.user || 'subir.ghosal',
          action: h.action,
          module: 'GST Invoice',
          details: `${inv.invoiceNumber}: ${h.remarks}`
        });
      });
    });

    // Payment receipts creation
    receiptList.slice(-15).forEach(r => {
      activities.push({
        id: `act-rec-${r.id}`,
        timestamp: r.createdAt || new Date().toISOString(),
        user: r.createdBy || 'subir.ghosal',
        action: 'Payment Receipt Created',
        module: 'Payment Receipt',
        details: `${r.receiptNumber}: Received ₹${r.amount.toLocaleString()} from ${r.customerName}`
      });
    });

    // Proforma Invoice timeline
    piList.slice(-15).forEach(pi => {
      pi.timeline?.forEach(evt => {
        activities.push({
          id: evt.id || `act-pi-${Math.random()}`,
          timestamp: evt.date ? `${evt.date}T${evt.time || '12:00:00'}Z` : pi.createdAt,
          user: evt.user || 'subir.ghosal',
          action: evt.stage,
          module: 'Proforma Invoice',
          details: `${pi.piNumber}: ${evt.remarks || ''}`
        });
      });
    });

    // Quotation history
    quotationList.slice(-15).forEach(q => {
      activities.push({
        id: `act-q-${q.id}`,
        timestamp: q.updatedAt || q.date,
        user: q.salesExecutive || 'Sales Team',
        action: `Quotation ${q.status}`,
        module: 'Quotation',
        details: `${q.quotationNumber} for ${q.customerName}`
      });
    });

    // Sort recent activities chronologically (newest first)
    const recentActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      todayQuotationsCount,
      todayConfirmedOrdersCount,
      todayConfirmedOrdersValue,
      todaySalesValue,
      thisMonthSalesValue,
      thisFinancialYearSalesValue,
      totalPaymentReceived,
      totalCustomerOutstanding,
      activeJobsCount,
      pendingDispatchCount,
      lowStockCount,
      expensesValue,
      supplierBalanceValue,
      cashReceiptValue,
      onlineReceiptValue,
      pendingQuotationsCount,
      purchasePendingCount,
      qcPendingCount,
      reworkPendingCount,
      salesOverviewData,
      salesPeriodLabel,
      conversionStats,
      pipelineStages,
      urgentJobs,
      machines,
      inventoryAlerts,
      ageingSummary,
      recentActivities
    };
  }
}
