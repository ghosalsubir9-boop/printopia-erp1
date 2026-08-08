/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GstConfigService } from './gstConfigService';

export interface GstClassification {
  type: 'B2B' | 'B2CL' | 'B2CS';
  isInterState: boolean;
  isRegistered: boolean;
}

export class GstClassificationService {
  /**
   * Classifies an invoice based on GST rules
   */
  public static classify(
    gstin: string | undefined,
    customerStateCode: string,
    companyStateCode: string,
    invoiceValue: number,
    date?: string
  ): GstClassification {
    const config = GstConfigService.getCurrentConfig(date);
    const isRegistered = !!gstin && gstin.length === 15;
    const isInterState = customerStateCode !== companyStateCode;

    if (isRegistered) {
      return { type: 'B2B', isInterState, isRegistered: true };
    }

    if (isInterState && invoiceValue > config.b2clThreshold) {
      return { type: 'B2CL', isInterState, isRegistered: false };
    }

    return { type: 'B2CS', isInterState, isRegistered: false };
  }
}
