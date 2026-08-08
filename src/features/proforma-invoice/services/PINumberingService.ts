import { ProformaInvoice } from '../types';

export class PINumberingService {
  /**
   * Returns Indian Financial Year string, e.g., '2026-27' for April 2026 - March 2027.
   */
  static getFinancialYearString(dateInput?: Date | string): string {
    const d = dateInput ? new Date(dateInput) : new Date();
    const month = d.getMonth(); // 0-indexed: 3 = April
    const year = d.getFullYear();
    const startYear = month >= 3 ? year : year - 1;
    const endYear = (startYear + 1) % 100;
    const endYearStr = endYear < 10 ? `0${endYear}` : `${endYear}`;
    return `${startYear}-${endYearStr}`;
  }

  /**
   * Generates sequential PI Number e.g. PI/2026-27/0001
   */
  static generateNextPINumber(existingPIs: ProformaInvoice[], dateInput?: Date | string): string {
    const finYear = this.getFinancialYearString(dateInput);
    const prefix = `PI/${finYear}/`;

    const matchingNumbers = existingPIs
      .map(pi => pi.piNumber)
      .filter(num => num && num.startsWith(prefix));

    let maxSeq = 0;
    matchingNumbers.forEach(num => {
      const parts = num.split('/');
      if (parts.length === 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });

    const nextSeq = maxSeq + 1;
    const seqStr = nextSeq.toString().padStart(4, '0');
    return `${prefix}${seqStr}`;
  }

  /**
   * Generates sequential payment number e.g. PAY-2026-0001
   */
  static generateNextPaymentNumber(existingPIs: ProformaInvoice[]): string {
    let maxSeq = 0;
    const currentYear = new Date().getFullYear();
    const prefix = `PAY-${currentYear}-`;

    existingPIs.forEach(pi => {
      (pi.payments || []).forEach(p => {
        if (p.paymentNumber && p.paymentNumber.startsWith(prefix)) {
          const parts = p.paymentNumber.split('-');
          if (parts.length === 3) {
            const seq = parseInt(parts[2], 10);
            if (!isNaN(seq) && seq > maxSeq) {
              maxSeq = seq;
            }
          }
        }
      });
    });

    const nextSeq = maxSeq + 1;
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }
}
