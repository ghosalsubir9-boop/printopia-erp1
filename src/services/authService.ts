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
  | 'ACCOUNTS'
  | 'Admin'
  | 'Sales Executive'
  | 'Designer'
  | 'Printer'
  | 'Accounts';

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

// Active OTP store for demo verification (in-memory)
interface OTPRecord {
  code: string;
  expiresAt: number;
  user: UserRecord;
}

const otpStore = new Map<string, OTPRecord>();

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

    // Super Admin has global access unless explicit support mode
    if (currentUser.role === 'SUPER_ADMIN') {
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

  public static loginWithEmail(email: string, password: string): UserSession {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Please enter both email address and password.');
    }

    const matched = TenantService.getUserByEmailOrMobile(cleanEmail);

    if (!matched || matched.passwordHash !== cleanPassword) {
      throw new Error('Invalid email address or password. Please check your credentials and try again.');
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

    return this.createSession({
      userId: matched.userId,
      userName: matched.userName,
      email: matched.email,
      mobile: matched.mobile,
      role: matched.role,
      companyId: matched.companyId,
      companyName: matched.companyName
    });
  }

  public static sendMobileOTP(mobileNumber: string): { success: boolean; message: string } {
    const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      throw new Error('Please enter a valid 10-digit Indian mobile number.');
    }

    const matchedUser = TenantService.getUserByEmailOrMobile(cleanMobile);
    if (!matchedUser) {
      throw new Error('Mobile number is not registered with any active ERP organization account.');
    }

    if (matchedUser.status !== 'ACTIVE') {
      throw new Error('Your user account is deactivated. Please contact your administrator.');
    }

    const demoOtp = '123456';
    const expiresAt = Date.now() + 2 * 60 * 1000;

    otpStore.set(cleanMobile, {
      code: demoOtp,
      expiresAt,
      user: matchedUser
    });

    return {
      success: true,
      message: `OTP sent successfully to +91 ${cleanMobile}`
    };
  }

  public static verifyMobileOTP(mobileNumber: string, otp: string): UserSession {
    const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
    const cleanOtp = otp.trim();

    if (!cleanMobile || cleanMobile.length !== 10) {
      throw new Error('Valid 10-digit mobile number is required.');
    }

    if (!cleanOtp) {
      throw new Error('Please enter the 6-digit verification OTP code.');
    }

    const record = otpStore.get(cleanMobile);
    if (!record || record.code !== cleanOtp) {
      throw new Error('Invalid OTP verification code. Please check and try again.');
    }

    if (Date.now() > record.expiresAt) {
      throw new Error('OTP code has expired. Please click Resend OTP to receive a fresh code.');
    }

    const matched = record.user;

    if (matched.role !== 'SUPER_ADMIN' && matched.companyId) {
      const tenant = TenantService.getTenantById(matched.companyId);
      if (!tenant) {
        throw new Error('Organization details not found.');
      }
      if (tenant.status === 'SUSPENDED') {
        throw new Error('Your company account is currently suspended. Please contact your ERP provider.');
      }
      if (tenant.status === 'INACTIVE') {
        throw new Error('Your company account is inactive.');
      }
    }

    otpStore.delete(cleanMobile);
    return this.createSession({
      userId: matched.userId,
      userName: matched.userName,
      email: matched.email,
      mobile: matched.mobile,
      role: matched.role,
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
  public static isModuleAllowed(role: UserRole, moduleId: string): boolean {
    if (role === 'SUPER_ADMIN') {
      return true;
    }

    if (role === 'COMPANY_ADMIN' || role === 'Admin') {
      return true;
    }

    const allowedMap: Record<string, string[]> = {
      'SALES_EXECUTIVE': [
        'dashboard', 'customers', 'vendors', 'estimates', 'quotations',
        'proforma-invoices', 'gst-invoices', 'payment-receipts', 'customer-outstanding',
        'credit-notes', 'company-settings', 'job-cards'
      ],
      'Sales Executive': [
        'dashboard', 'customers', 'vendors', 'estimates', 'quotations',
        'proforma-invoices', 'gst-invoices', 'payment-receipts', 'customer-outstanding',
        'credit-notes', 'company-settings', 'job-cards'
      ],
      'DESIGNER': [
        'dashboard', 'products', 'papers', 'estimates', 'job-cards', 'production'
      ],
      'Designer': [
        'dashboard', 'products', 'papers', 'estimates', 'job-cards', 'production'
      ],
      'PRINTER': [
        'dashboard', 'machines', 'papers', 'job-cards', 'production', 'inventory', 'grns'
      ],
      'Printer': [
        'dashboard', 'machines', 'papers', 'job-cards', 'production', 'inventory', 'grns'
      ],
      'ACCOUNTS': [
        'dashboard', 'customers', 'vendors', 'quotations', 'proforma-invoices',
        'gst-invoices', 'payment-receipts', 'customer-outstanding', 'credit-notes',
        'purchase-orders', 'grns', 'purchase-invoices', 'vendor-outstanding',
        'finance', 'vouchers', 'financial-reports', 'gst-reports', 'company-settings'
      ],
      'Accounts': [
        'dashboard', 'customers', 'vendors', 'quotations', 'proforma-invoices',
        'gst-invoices', 'payment-receipts', 'customer-outstanding', 'credit-notes',
        'purchase-orders', 'grns', 'purchase-invoices', 'vendor-outstanding',
        'finance', 'vouchers', 'financial-reports', 'gst-reports', 'company-settings'
      ]
    };

    const allowed = allowedMap[role] || [];
    return allowed.includes('*') || allowed.includes(moduleId);
  }
}
