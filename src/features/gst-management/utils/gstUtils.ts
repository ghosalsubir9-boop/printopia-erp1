/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GstPeriod } from '../types';

const KEYS = {
  GST_PERIODS: 'printopia_gst_periods'
};

export class GstUtils {
  private static getPeriods(): GstPeriod[] {
    const data = localStorage.getItem(KEYS.GST_PERIODS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  public static isPeriodLocked(date: string): boolean {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const periods = this.getPeriods();
    const period = periods.find(p => p.year === year && p.month === month);
    return period ? (period.status === 'Locked' || period.status === 'Filed') : false;
  }

  public static validateGstinChecksum(gstin: string): boolean {
    if (!gstin || gstin.length !== 15) return false;
    
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let sum = 0;
    
    for (let i = 0; i < 14; i++) {
      let val = chars.indexOf(gstin[i]);
      if (val === -1) return false;
      
      const weight = (i % 2 === 0) ? 1 : 2;
      const product = val * weight;
      
      sum += Math.floor(product / 36) + (product % 36);
    }
    
    const checkVal = (36 - (sum % 36)) % 36;
    const expectedCheckDigit = chars[checkVal];
    
    return gstin[14] === expectedCheckDigit;
  }
}
