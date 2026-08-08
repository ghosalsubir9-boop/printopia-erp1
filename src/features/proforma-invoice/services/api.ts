import { ProformaInvoice, PIPayment } from '../types';
import { PINumberingService } from './PINumberingService';
import { PICalculationService } from './PICalculationService';
import { CompanySettingsService } from '../../../services/CompanySettingsService';
import { AuthService } from '../../../services/authService';

const STORAGE_KEY = 'printopia_proforma_invoices';

export class PIApiService {
  private static getStoredInvoices(): ProformaInvoice[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private static setStoredInvoices(invoices: ProformaInvoice[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  }

  static async getInvoices(): Promise<ProformaInvoice[]> {
    const list = this.getStoredInvoices();
    const currentCompanyId = AuthService.getCurrentCompanyId();
    return list.filter((i) => !i.companyId || i.companyId === currentCompanyId);
  }

  static async getInvoiceById(id: string): Promise<ProformaInvoice | null> {
    const invoices = this.getStoredInvoices();
    return invoices.find(i => i.id === id) || null;
  }

  /**
   * Checks if any option ID is already present in an active (non-cancelled) PI.
   */
  static isOptionAlreadyConverted(optionId: string, currentPiId?: string): boolean {
    const invoices = this.getStoredInvoices();
    return invoices.some(pi => 
      pi.id !== currentPiId &&
      pi.status !== 'Cancelled' &&
      (pi.convertedOptionIds || []).includes(optionId)
    );
  }

  /**
   * Central function to check production approval eligibility based on release rules
   */
  static getProductionApprovalEligibility(pi: ProformaInvoice, companySettings?: any): { eligible: boolean; canApprove: boolean; reason?: string } {
    if (pi.status === 'Cancelled') {
      return { eligible: false, canApprove: false, reason: 'Proforma Invoice is cancelled.' };
    }

    const settings = companySettings || CompanySettingsService.getSettings();
    const rule = settings.productionReleaseRule || 'Required Advance Received';

    if (rule === 'Manual Approval' || rule === 'MANUAL_APPROVAL' || rule === 'No Payment Restriction' || rule === 'NO_PAYMENT_RESTRICTION') {
      return { eligible: true, canApprove: true };
    } else if (rule === 'Required Advance Received' || rule === 'REQUIRED_ADVANCE') {
      const required = pi.advanceRequiredAmount || pi.advanceAmount || 0;
      const received = pi.totalReceived || 0;
      if (required > 0 && received < required) {
        return { 
          eligible: false, 
          canApprove: false, 
          reason: `Required advance payment of ₹${required.toLocaleString('en-IN')} has not been received. Total received so far: ₹${received.toLocaleString('en-IN')}` 
        };
      }
      return { eligible: true, canApprove: true };
    } else if (rule === 'Full Payment Received' || rule === 'FULL_PAYMENT') {
      const balance = pi.balanceDue ?? pi.balanceAmount ?? 0;
      if (balance > 0) {
        return { 
          eligible: false, 
          canApprove: false, 
          reason: `Full payment is required before production approval. Balance Outstanding: ₹${balance.toLocaleString('en-IN')}` 
        };
      }
      return { eligible: true, canApprove: true };
    }

    return { eligible: true, canApprove: true };
  }

  /**
   * Checks if a PI is eligible for production approval based on company release rules
   */
  static canApproveForProduction(pi: ProformaInvoice): { canApprove: boolean; reason?: string } {
    if (pi.productionApproved || pi.isProductionApproved) {
      return { canApprove: true };
    }
    const check = this.getProductionApprovalEligibility(pi);
    return { canApprove: check.eligible, reason: check.reason };
  }

  /**
   * Checks if a PI can be converted into a Production Order / Job Card
   */
  static canConvertToProduction(pi: ProformaInvoice): { canConvert: boolean; reason?: string } {
    if (pi.status === 'Cancelled') {
      return { canConvert: false, reason: 'Proforma Invoice is cancelled.' };
    }
    if (pi.productionApproved || pi.isProductionApproved || pi.status === 'Production Approved' || pi.status === 'Converted to Production') {
      return { canConvert: true };
    }

    return { 
      canConvert: false, 
      reason: 'Proforma Invoice requires explicit Production Approval by Admin before a Production Order can be created.' 
    };
  }

  static async saveInvoice(invoice: Partial<ProformaInvoice>): Promise<ProformaInvoice> {
    const invoices = this.getStoredInvoices();
    const currentCompanyId = AuthService.getCurrentCompanyId();
    const companySettings = CompanySettingsService.getSettings();
    const companyStateCode = companySettings.stateCode || '19';

    // Recalculate totals
    const calculated = PICalculationService.calculateTotals(invoice, companyStateCode);
    const companyId = invoice.companyId || calculated.companyId || currentCompanyId;

    if (calculated.id) {
      const index = invoices.findIndex(i => i.id === calculated.id);
      if (index !== -1) {
        const updated = {
          ...invoices[index],
          ...calculated,
          companyId,
          updatedAt: new Date().toISOString()
        } as ProformaInvoice;
        invoices[index] = updated;
        this.setStoredInvoices(invoices);
        return updated;
      }
    }

    // New Invoice Creation
    const now = new Date();
    const tenantInvoices = invoices.filter(i => !i.companyId || i.companyId === companyId);
    const piNumber = calculated.piNumber || PINumberingService.generateNextPINumber(tenantInvoices, calculated.date || now);

    const newInvoice: ProformaInvoice = {
      ...calculated,
      id: calculated.id || `pi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      companyId,
      piNumber,
      basePiNumber: piNumber,
      revisionNumber: 0,
      isLatest: true,
      isLocked: false,
      status: calculated.status || 'Draft',
      totalReceived: calculated.totalReceived || 0,
      payments: calculated.payments || [],
      convertedOptionIds: calculated.convertedOptionIds || (calculated.items || []).map(i => i.quotationOptionId).filter(Boolean),
      companyStateCode,
      timeline: calculated.timeline || [
        {
          id: Math.random().toString(36).substring(2, 9),
          stage: 'PI Generated',
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString(),
          user: calculated.createdBy || 'System',
          remarks: `Proforma Invoice ${piNumber} generated from Quotation ${calculated.quotationNumber || ''}`
        }
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: calculated.createdBy || 'System'
    } as ProformaInvoice;

    invoices.push(newInvoice);
    this.setStoredInvoices(invoices);
    return newInvoice;
  }

  static async createRevision(id: string, reason: string): Promise<ProformaInvoice> {
    const invoices = this.getStoredInvoices();
    const originalIndex = invoices.findIndex(i => i.id === id);
    if (originalIndex === -1) throw new Error('Proforma Invoice not found');

    const original = invoices[originalIndex];
    
    // Mark original as not latest and lock it
    invoices[originalIndex] = { ...original, isLatest: false, isLocked: true };

    const revisionNumber = (original.revisionNumber || 0) + 1;
    const baseNumber = original.basePiNumber || original.piNumber;
    const newPiNumber = `${baseNumber}-R${revisionNumber}`;

    const now = new Date();
    const newRevision: ProformaInvoice = {
      ...original,
      id: `pi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      piNumber: newPiNumber,
      basePiNumber: baseNumber,
      revisionNumber,
      revisionDate: now.toISOString(),
      revisionBy: 'System',
      revisionReason: reason,
      isLatest: true,
      isLocked: false,
      status: 'Draft',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      timeline: [
        ...(original.timeline || []),
        {
          id: Math.random().toString(36).substring(2, 9),
          stage: 'Revision Created',
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString(),
          user: 'System',
          remarks: `Revision ${revisionNumber} created: ${reason}`
        }
      ]
    };

    invoices.push(newRevision);
    this.setStoredInvoices(invoices);
    return newRevision;
  }

  static async addPayment(id: string, paymentData: Omit<PIPayment, 'id' | 'paymentNumber' | 'piId' | 'piNumber' | 'customerName' | 'createdAt'>): Promise<ProformaInvoice> {
    const invoices = this.getStoredInvoices();
    const index = invoices.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Proforma Invoice not found');

    const pi = invoices[index];
    if (pi.status === 'Cancelled') {
      throw new Error('Cannot add payment to a cancelled Proforma Invoice');
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    if (paymentData.amount > pi.balanceDue + 0.01) {
      throw new Error(`Payment amount (₹${paymentData.amount}) cannot exceed Balance Due (₹${pi.balanceDue})`);
    }

    const paymentNumber = PINumberingService.generateNextPaymentNumber(invoices);
    const now = new Date();

    const newPaymentRecord: PIPayment = {
      ...paymentData,
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      paymentNumber,
      piId: pi.id,
      piNumber: pi.piNumber,
      customerName: pi.customerName,
      createdAt: now.toISOString()
    };

    const updatedPayments = [...(pi.payments || []), newPaymentRecord];
    
    // Recalculate
    const companySettings = CompanySettingsService.getSettings();
    const recalculated = PICalculationService.calculateTotals({
      ...pi,
      payments: updatedPayments
    }, companySettings.stateCode || '19');

    // Update Status
    let newStatus = pi.status;
    if (recalculated.balanceDue! <= 0) {
      newStatus = 'Paid';
    } else if (recalculated.totalReceived! > 0 && pi.status !== 'Production Approved' && pi.status !== 'Converted to Production') {
      newStatus = 'Partially Paid';
    }

    const updated: ProformaInvoice = {
      ...pi,
      ...recalculated,
      payments: updatedPayments,
      status: newStatus,
      updatedAt: now.toISOString(),
      timeline: [
        ...(pi.timeline || []),
        {
          id: Math.random().toString(36).substring(2, 9),
          stage: recalculated.balanceDue! <= 0 ? 'Full Payment Received' : 'Payment Received',
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString(),
          user: paymentData.receivedBy || 'System',
          remarks: `Payment of ₹${paymentData.amount.toLocaleString('en-IN')} received via ${paymentData.mode} (${paymentNumber})`
        }
      ]
    } as ProformaInvoice;

    invoices[index] = updated;
    this.setStoredInvoices(invoices);
    return updated;
  }

  static async approveProduction(id: string, approvedBy: string = 'Admin', note?: string): Promise<ProformaInvoice> {
    const invoices = this.getStoredInvoices();
    const index = invoices.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Proforma Invoice not found');

    const pi = invoices[index];
    if (pi.status === 'Cancelled') {
      throw new Error('Cannot approve a cancelled Proforma Invoice');
    }

    const settings = CompanySettingsService.getSettings();
    const rule = settings.productionReleaseRule || 'Required Advance Received';

    // Verify release rule condition
    if (rule === 'Required Advance Received') {
      if (pi.advanceRequiredAmount > 0 && pi.totalReceived < pi.advanceRequiredAmount) {
        throw new Error(`Required advance payment of ₹${pi.advanceRequiredAmount.toLocaleString('en-IN')} has not been received. Total received so far: ₹${pi.totalReceived.toLocaleString('en-IN')}`);
      }
    } else if (rule === 'Full Payment Received') {
      if (pi.balanceDue > 0) {
        throw new Error(`Full payment is required before production release. Balance Due: ₹${pi.balanceDue.toLocaleString('en-IN')}`);
      }
    }

    const now = new Date();
    const updated: ProformaInvoice = {
      ...pi,
      productionApproved: true,
      productionApprovedAt: now.toISOString(),
      productionApprovedBy: approvedBy,
      productionApprovalNote: note,
      status: 'Production Approved',
      updatedAt: now.toISOString(),
      timeline: [
        ...(pi.timeline || []),
        {
          id: Math.random().toString(36).substring(2, 9),
          stage: 'Production Approved',
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString(),
          user: approvedBy,
          remarks: note || `Approved for production under rule: ${rule}`
        }
      ]
    };

    invoices[index] = updated;
    this.setStoredInvoices(invoices);
    return updated;
  }

  static async updateStatus(id: string, status: ProformaInvoice['status'], remarks?: string, user: string = 'System'): Promise<ProformaInvoice> {
    const invoices = this.getStoredInvoices();
    const index = invoices.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Proforma Invoice not found');

    const pi = invoices[index];
    const now = new Date();

    const updated: ProformaInvoice = {
      ...pi,
      status,
      isLocked: status === 'Production Approved' || status === 'Converted to Production' || status === 'Paid' || status === 'Cancelled',
      updatedAt: now.toISOString(),
      timeline: [
        ...(pi.timeline || []),
        {
          id: Math.random().toString(36).substring(2, 9),
          stage: `Status: ${status}`,
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString(),
          user,
          remarks: remarks || `Status updated to ${status}`
        }
      ]
    };

    invoices[index] = updated;
    this.setStoredInvoices(invoices);
    return updated;
  }

  static async deleteInvoice(id: string): Promise<void> {
    const invoices = this.getStoredInvoices();
    const filtered = invoices.filter(i => i.id !== id);
    this.setStoredInvoices(filtered);
  }
}

