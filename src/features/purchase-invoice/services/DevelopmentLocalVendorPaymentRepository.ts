/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VendorPaymentRepository } from './VendorPaymentRepository';
import { VendorPayment } from '../types';

const KEYS = {
  PAYMENTS: 'printopia_vendor_payments'
};

export class DevelopmentLocalVendorPaymentRepository implements VendorPaymentRepository {
  private getStored<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
    }
  }

  private saveStored(key: string, data: any): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  async getPayments(): Promise<VendorPayment[]> {
    return this.getStored<VendorPayment[]>(KEYS.PAYMENTS, []);
  }

  async getPaymentById(id: string): Promise<VendorPayment | undefined> {
    const payments = await this.getPayments();
    return payments.find(p => p.id === id);
  }

  async savePayments(payments: VendorPayment[]): Promise<void> {
    this.saveStored(KEYS.PAYMENTS, payments);
  }
}
