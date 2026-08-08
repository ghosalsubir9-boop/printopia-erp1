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
    return list.filter((q) => !q.companyId || q.companyId === currentCompanyId);
  }

  static async getQuotationById(id: string): Promise<QuotationHeader | null> {
    const quotations = this.getStoredQuotations();
    return quotations.find(q => q.id === id) || null;
  }

  static async saveQuotation(quotation: QuotationHeader): Promise<QuotationHeader> {
    const quotations = this.getStoredQuotations();
    const currentCompanyId = AuthService.getCurrentCompanyId();
    const index = quotations.findIndex(q => q.id === quotation.id);

    const companyId = quotation.companyId || currentCompanyId;
    const preparedQuotation: QuotationHeader = {
      ...quotation,
      companyId
    };
    
    if (index >= 0) {
      quotations[index] = { ...preparedQuotation, updatedAt: new Date().toISOString() };
    } else {
      quotations.push({ 
        ...preparedQuotation, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      });
    }
    
    this.setStoredQuotations(quotations);
    return preparedQuotation;
  }

  static async deleteQuotation(id: string): Promise<void> {
    const quotations = this.getStoredQuotations();
    this.setStoredQuotations(quotations.filter(q => q.id !== id));
  }

  static generateQuotationNumber(): string {
    const quotations = this.getStoredQuotations();
    const currentCompanyId = AuthService.getCurrentCompanyId();
    const tenantQuotations = quotations.filter((q) => !q.companyId || q.companyId === currentCompanyId);
    const year = new Date().getFullYear();
    const count = tenantQuotations.length + 1;
    return `QT-${year}-${count.toString().padStart(4, '0')}`;
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
