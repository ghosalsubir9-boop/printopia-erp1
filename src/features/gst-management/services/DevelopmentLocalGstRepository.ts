/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GstRepository } from './GstRepository';
import { GstPeriod, FilingChecklistItem, GstAuditLog } from '../types';

const KEYS = {
  GST_PERIODS: 'printopia_gst_periods',
  CHECKLIST_PREFIX: 'printopia_gst_checklist_',
  AUDIT_LOGS: 'printopia_gst_audit_logs'
};

export class DevelopmentLocalGstRepository implements GstRepository {
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

  async getPeriods(): Promise<GstPeriod[]> {
    return this.getStored<GstPeriod[]>(KEYS.GST_PERIODS, []);
  }

  async getPeriodById(id: string): Promise<GstPeriod | undefined> {
    const periods = await this.getPeriods();
    return periods.find(p => p.id === id);
  }

  async savePeriods(periods: GstPeriod[]): Promise<void> {
    this.saveStored(KEYS.GST_PERIODS, periods);
  }

  async getChecklistItems(periodId: string): Promise<FilingChecklistItem[]> {
    return this.getStored<FilingChecklistItem[]>(`${KEYS.CHECKLIST_PREFIX}${periodId}`, []);
  }

  async saveChecklistItems(periodId: string, items: FilingChecklistItem[]): Promise<void> {
    this.saveStored(`${KEYS.CHECKLIST_PREFIX}${periodId}`, items);
  }

  async getAuditLogs(): Promise<GstAuditLog[]> {
    return this.getStored<GstAuditLog[]>(KEYS.AUDIT_LOGS, []);
  }

  async saveAuditLogs(logs: GstAuditLog[]): Promise<void> {
    this.saveStored(KEYS.AUDIT_LOGS, logs);
  }
}
