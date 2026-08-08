/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GstConfig {
  effectiveFrom: string;
  effectiveTo: string | null;
  b2clThreshold: number;
  schemaVersion: string;
  description: string;
}

export class GstConfigService {
  private static readonly CONFIGS: GstConfig[] = [
    {
      effectiveFrom: '2017-07-01',
      effectiveTo: null,
      b2clThreshold: 250000,
      schemaVersion: '1.0',
      description: 'Standard GST classification rules (Return-preparation logic)'
    }
  ];

  public static getCurrentConfig(date: string = new Date().toISOString()): GstConfig {
    const config = this.CONFIGS.find(c => {
      const from = new Date(c.effectiveFrom);
      const to = c.effectiveTo ? new Date(c.effectiveTo) : new Date('9999-12-31');
      const target = new Date(date);
      return target >= from && target <= to;
    });

    return config || this.CONFIGS[0];
  }
}
