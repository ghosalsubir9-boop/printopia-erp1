import { QuotationHeader, QuotationStatus } from '../types';
import { AuthService } from '../../../services/authService';

const STORAGE_KEY = 'printopia_quotations';

export class QuotationApiService {
  private static getStoredQuotations(): QuotationHeader[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private static setStoredQuotations(quotations: QuotationHeader[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotations));
  }

  static async getQuotations(): Promise<QuotationHeader[]> {
    const list = this.getStoredQuotations();
    const currentCompanyId = AuthService.getCurrentCompanyId();
    return list.filter((q) => q.companyId === currentCompanyId);
  }

  static async getQuotationById(id: string): Promise<QuotationHeader | null> {
    const quotations = this.getStoredQuotations();
    const q = quotations.find(item => item.id === id);
    if (!q) return null;
    AuthService.assertTenantAccess(q.companyId, AuthService.getCurrentUser());
    return q;
  }

  static async saveQuotation(quotation: QuotationHeader): Promise<QuotationHeader> {
    const quotations = this.getStoredQuotations();
    const index = quotations.findIndex(q => q.id === quotation.id);

    if (index >= 0) {
      const existing = quotations[index];
      AuthService.assertTenantAccess(existing.companyId, AuthService.getCurrentUser());
      const updated: QuotationHeader = {
        ...existing,
        ...quotation,
        id: existing.id,
        companyId: existing.companyId, // PROTECT TENANT OWNERSHIP
        quotationNumber: existing.quotationNumber,
        updatedAt: new Date().toISOString()
      };
      quotations[index] = updated;
      this.setStoredQuotations(quotations);
      return updated;
    }

    const companyId = AuthService.requireCurrentCompanyId();
    const preparedQuotation: QuotationHeader = {
      ...quotation,
      companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    quotations.push(preparedQuotation);
    this.setStoredQuotations(quotations);
    return preparedQuotation;
  }

  static async deleteQuotation(id: string): Promise<void> {
    const quotations = this.getStoredQuotations();
    const target = quotations.find(q => q.id === id);
    if (target) {
      AuthService.assertTenantAccess(target.companyId, AuthService.getCurrentUser());
    }
    this.setStoredQuotations(quotations.filter(q => q.id !== id));
  }

  static generateQuotationNumber(): string {
    const quotations = this.getStoredQuotations();
    const currentCompanyId = AuthService.getCurrentCompanyId();
    const tenantQuotations = quotations.filter((q) => q.companyId === currentCompanyId);
    
    const d = new Date();
    const startYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    const endYearStr = String((startYear + 1) % 100).padStart(2, '0');
    const finYear = `${startYear}-${endYearStr}`;
    const prefix = `QT/${finYear}/`;

    let maxSeq = 0;
    tenantQuotations.forEach((q) => {
      if (q.quotationNumber && q.quotationNumber.startsWith(prefix)) {
        const parts = q.quotationNumber.split('/');
        if (parts.length === 3) {
          const seq = parseInt(parts[2], 10);
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      }
    });

    const nextSeq = maxSeq > 0 ? maxSeq + 1 : tenantQuotations.length + 1;
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }

  static async createRevision(originalId: string, reason: string, revisedBy: string): Promise<QuotationHeader> {
    const quotations = this.getStoredQuotations();
    const original = quotations.find(q => q.id === originalId);
    if (!original) throw new Error('Quotation not found');

    const nextRevNum = original.currentRevision + 1;
    const revisionCode = `R${nextRevNum}`;
    
    const newRevision = {
      id: Math.random().toString(36).substr(2, 9),
      quotationId: original.id,
      revisionNumber: nextRevNum,
      revisionCode,
      date: new Date().toISOString(),
      revisedBy,
      reason
    };

    const updatedQuotation: QuotationHeader = {
      ...original,
      currentRevision: nextRevNum,
      revisions: [...original.revisions, newRevision],
      status: 'Revised',
      updatedAt: new Date().toISOString()
    };

    await this.saveQuotation(updatedQuotation);
    return updatedQuotation;
  }

  static async updateItemOptionStatus(
    quotationId: string, 
    optionId: string, 
    status: 'Pending' | 'Accepted' | 'Rejected'
  ): Promise<QuotationHeader> {
    const quotations = this.getStoredQuotations();
    const qIndex = quotations.findIndex(q => q.id === quotationId);
    if (qIndex === -1) throw new Error('Quotation not found');

    const quotation = { ...quotations[qIndex] };
    quotation.items = quotation.items.map(item => ({
      ...item,
      options: item.options.map(opt => opt.id === optionId ? { ...opt, status } : opt)
    }));

    await this.saveQuotation(quotation);
    return quotation;
  }
}
