/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GstPeriod, FilingChecklistItem, GstAuditLog } from '../types';

export interface GstRepository {
  getPeriods(): Promise<GstPeriod[]>;
  getPeriodById(id: string): Promise<GstPeriod | undefined>;
  savePeriods(periods: GstPeriod[]): Promise<void>;
  
  getChecklistItems(periodId: string): Promise<FilingChecklistItem[]>;
  saveChecklistItems(periodId: string, items: FilingChecklistItem[]): Promise<void>;
  
  getAuditLogs(): Promise<GstAuditLog[]>;
  saveAuditLogs(logs: GstAuditLog[]): Promise<void>;
}
