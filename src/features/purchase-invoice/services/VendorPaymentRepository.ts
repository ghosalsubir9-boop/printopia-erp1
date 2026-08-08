/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VendorPayment } from '../types';

export interface VendorPaymentRepository {
  getPayments(): Promise<VendorPayment[]>;
  getPaymentById(id: string): Promise<VendorPayment | undefined>;
  savePayments(payments: VendorPayment[]): Promise<void>;
}
