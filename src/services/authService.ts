/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TenantService, TenantCompany, UserRecord } from './TenantService';
import { LegacyMigrationService } from './LegacyMigrationService';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'COMPANY_ADMIN'
  | 'SALES_EXECUTIVE'
  | 'DESIGNER'
  | 'PRINTER'
  | 'ACCOUNTS';

export function normalizeRole(role: string): UserRole {
  switch (role) {
    case 'Admin':
      return 'COMPANY_ADMIN';
    case 'Sales Executive':
    case 'Sales':
      return 'SALES_EXECUTIVE';
    case 'Designer':
      return 'DESIGNER';
    case 'Printer':
    case 'Production':
      return 'PRINTER';
    case 'Accounts':
      return 'ACCOUNTS';
    default:
      return role as UserRole;
  }
}

export interface UserSession {
  userId: string;
  userName: string;
  email: string;
  mobile?: string;
  role: UserRole;
  companyId: string | null; // null for SUPER_ADMIN
  companyName?: string;
  supportTenantId?: string | null; // For Super Admin support mode
  token: string;
  createdAt: string;
  expiresAt: string;
}

export class AuthService {
  private static readonly SESSION_KEY = 'printopia_user_session_v2';
  private static readonly TOKEN_EXPIRY_HOURS = 12;

  /**
   * Asserts tenant isolation. Throws an exception if cross-tenant access is attempted.
   */
  public static assertTenantAccess(
    recordCompanyId: string | undefined | null,
    currentUser: UserSession | null
  ): void {
    if (!currentUser) {
      throw new Error('Access Denied: Authentication required.');
    }

    // Super Admin must enter company support context to access tenant business records
    if (currentUser.role === 'SUPER_ADMIN') {
      const activeSupportTenantId = currentUser.supportTenantId;
      if (!activeSupportTenantId) {
        throw new Error('Access Denied: Super Admin must enter company support context to access tenant business records.');
      }
      if (recordCompanyId && recordCompanyId !== activeSupportTenantId) {
        throw new Error('Access Denied: You cannot access records outside the active support tenant context.');
      }
      return;
    }

    if (!recordCompanyId || recordCompanyId !== currentUser.companyId) {
      throw new Error(
        'Access Denied: You do not have permission to access records belonging to another organization.'
      );
    }
  }

  public static getCurrentUser(): UserSession | null {
    // Run legacy data migration lazily on initial access
    LegacyMigrationService.runMigrationIfNeeded();

    const sessionStr = localStorage.getItem(this.SESSION_KEY);
    if (!sessionStr) return null;

    try {
      const session: UserSession = JSON.parse(sessionStr);
      if (!session || !session.expiresAt) {
        this.logout();
        return null;
      }

      // Check session expiration
      if (new Date(session.expiresAt).getTime() < Date.now()) {
        console.warn('[AuthService] User session expired. Logging out...');
        this.logout();
        return null;
      }

      // Normalize role
      session.role = normalizeRole(session.role);

      // Verify tenant status if user belongs to a company
      if (session.role !== 'SUPER_ADMIN' && session.companyId) {
        const tenant = TenantService.getTenantById(session.companyId);
        if (!tenant || tenant.status === 'SUSPENDED' || tenant.status === 'INACTIVE') {
          console.warn(`[AuthService] Tenant ${session.companyId} status is ${tenant?.status}. Terminating session.`);
          this.logout();
          return null;
        }
      }

      return session;
    } catch (e) {
      this.logout();
      return null;
    }
  }

  public static getCurrentCompanyId(): string | null {
    const session = this.getCurrentUser();
    if (!session) return null;

    if (session.role === 'SUPER_ADMIN') {
      return session.supportTenantId || null;
    }

    return session.companyId || null;
  }

  public static requireCurrentCompanyId(): string {
    const companyId = this.getCurrentCompanyId();
    if (!companyId) {
      throw new Error('Tenant organization context is required for this action.');
    }
    return companyId;
  }

  public static requireCurrentUser(): UserSession {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required.');
    }
    return user;
  }

  public static setSupportTenant(tenantId: string | null): void {
    const session = this.getCurrentUser();
    if (!session || session.role !== 'SUPER_ADMIN') {
      throw new Error('Only Super Admin can switch support tenant context.');
    }

    session.supportTenantId = tenantId;
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  }

  public static isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  public static createSession(user: {
    userId: string;
    userName: string;
    email: string;
    mobile?: string;
    role: UserRole;
    companyId: string | null;
    companyName?: string;
  }): UserSession {
    const now = new Date();
    const expires = new Date(now.getTime() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    const session: UserSession = {
      userId: user.userId,
      userName: user.userName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      companyId: user.companyId,
      companyName: user.companyName,
      token: `pt_token_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString()
    };

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return session;
  }

  public static loginWithEmail(emailOrMobile: string, password: string): UserSession {
    const cleanIdentifier = emailOrMobile.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanIdentifier || !cleanPassword) {
      throw new Error('Please enter both email address / mobile number and password.');
    }

    const matched = TenantService.getUserByEmailOrMobile(cleanIdentifier);

    if (!matched || matched.passwordHash !== cleanPassword) {
      throw new Error('Invalid email address/mobile number or password. Please check your credentials and try again.');
    }

    if (matched.status !== 'ACTIVE') {
      throw new Error('Your user account is deactivated. Please contact your Company Administrator.');
    }

    // Check Tenant Status if user belongs to a tenant company
    if (matched.role !== 'SUPER_ADMIN' && matched.companyId) {
      const tenant = TenantService.getTenantById(matched.companyId);
      if (!tenant) {
        throw new Error('Organization details not found for this user.');
      }

      if (tenant.status === 'SUSPENDED') {
        throw new Error('Your company account is currently suspended. Please contact your ERP provider.');
      }

      if (tenant.status === 'INACTIVE') {
        throw new Error('Your company account is inactive. Please contact your administrator.');
      }

      if (tenant.expiryDate && new Date(tenant.expiryDate).getTime() < Date.now()) {
        throw new Error(`Your company subscription expired on ${tenant.expiryDate}. Please renew your plan.`);
      }
    }

    const canonicalRole = normalizeRole(matched.role);

    return this.createSession({
      userId: matched.userId,
      userName: matched.userName,
      email: matched.email,
      mobile: matched.mobile,
      role: canonicalRole,
      companyId: matched.companyId,
      companyName: matched.companyName
    });
  }

  public static logout(): void {
    localStorage.removeItem(this.SESSION_KEY);
  }

  /**
   * Role-Based Access Control (RBAC) Module Permission Matrix
   */
  public static isModuleAllowed(role: UserRole | string, moduleId: string): boolean {
    const canonicalRole = normalizeRole(role);

    if (canonicalRole === 'SUPER_ADMIN' || canonicalRole === 'COMPANY_ADMIN') {
      return true;
    }

    const allowedMap: Record<UserRole, string[]> = {
      'SUPER_ADMIN': ['*'],
      'COMPANY_ADMIN': ['*'],
      'SALES_EXECUTIVE': [
        'dashboard', 'customers', 'vendors', 'estimates', 'quotations',
        'proforma-invoices', 'gst-invoices', 'payment-receipts', 'customer-outstanding',
        'credit-notes', 'company-settings', 'job-cards'
      ],
      'DESIGNER': [
        'dashboard', 'products', 'papers', 'estimates', 'job-cards', 'production', 'production-execution', 'production-machine-queue'
      ],
      'PRINTER': [
        'dashboard', 'machines', 'papers', 'job-cards', 'production', 'production-execution', 'production-machine-queue', 'inventory', 'grns'
      ],
      'ACCOUNTS': [
        'dashboard', 'customers', 'vendors', 'quotations', 'proforma-invoices',
        'gst-invoices', 'payment-receipts', 'customer-outstanding', 'credit-notes',
        'purchase-orders', 'grns', 'purchase-invoices', 'vendor-outstanding',
        'finance', 'vouchers', 'financial-reports', 'gst-reports', 'company-settings'
      ]
    };

    const allowed = allowedMap[canonicalRole] || [];
    return allowed.includes('*') || allowed.includes(moduleId);
  }
}
