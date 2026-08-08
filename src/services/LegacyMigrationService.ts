/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const MIGRATION_VERSION_KEY = 'MULTI_TENANT_MIGRATION_V1';
export const DEFAULT_DEMO_TENANT_ID = 'company-1';

export class LegacyMigrationService {
  /**
   * Idempotent migration that assigns all existing records missing companyId
   * to the default tenant (PRINTOPIA_DEMO / company-1).
   */
  public static runMigrationIfNeeded(): void {
    const isCompleted = localStorage.getItem(MIGRATION_VERSION_KEY);
    if (isCompleted === 'true') {
      return;
    }

    console.log('[LegacyMigrationService] Running MULTI_TENANT_MIGRATION_V1...');

    const storageKeysToMigrate = [
      'printopia_customers',
      'printopia_products',
      'printopia_papers',
      'printopia_machine_master_registry_v3',
      'printopia_estimate_jobs',
      'printopia_quotations',
      'printopia_proforma_invoices',
      'printopia_payments',
      'printopia_vendors',
      'printopia_purchase_orders',
      'printopia_grns',
      'printopia_job_cards'
    ];

    for (const key of storageKeysToMigrate) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const items = JSON.parse(raw);
          if (Array.isArray(items)) {
            let modified = false;
            const updatedItems = items.map((item) => {
              if (item && typeof item === 'object' && !item.companyId) {
                modified = true;
                return {
                  ...item,
                  companyId: DEFAULT_DEMO_TENANT_ID,
                  scope: item.scope || (key === 'printopia_products' || key === 'printopia_papers' ? 'TENANT' : undefined)
                };
              }
              return item;
            });

            if (modified) {
              localStorage.setItem(key, JSON.stringify(updatedItems));
              console.log(`[LegacyMigrationService] Migrated missing companyId for ${key}`);
            }
          }
        }
      } catch (err) {
        console.error(`[LegacyMigrationService] Error migrating key ${key}:`, err);
      }
    }

    // Migrate default company settings if present
    const defaultSettings = localStorage.getItem('company_settings');
    if (defaultSettings && !localStorage.getItem(`company_settings_${DEFAULT_DEMO_TENANT_ID}`)) {
      localStorage.setItem(`company_settings_${DEFAULT_DEMO_TENANT_ID}`, defaultSettings);
    }

    // Mark migration as completed
    localStorage.setItem(MIGRATION_VERSION_KEY, 'true');
    console.log('[LegacyMigrationService] MULTI_TENANT_MIGRATION_V1 completed successfully.');
  }
}
