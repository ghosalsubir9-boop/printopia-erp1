/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VendorOutstandingSummary, VendorLedgerEntry } from '../types';

export interface VendorOutstandingRepository {
  getOutstandingSummaries(): Promise<VendorOutstandingSummary[]>;
  getVendorLedger(vendorId: string): Promise<VendorLedgerEntry[]>;
}
