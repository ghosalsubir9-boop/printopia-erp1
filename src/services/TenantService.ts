/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from './authService';

export type TenantStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TRIAL';
export type TenantPlan = 'ENTERPRISE' | 'PRO' | 'STARTER' | 'TRIAL';

export interface TenantCompany {
  id: string;
  companyCode: string;
  companyName: string;
  legalName: string;
  gstin: string;
  email: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  status: TenantStatus;
  plan: TenantPlan;
  activationDate: string;
  expiryDate: string;
  createdAt: string;
  createdBy: string;
  logoUrl?: string;
}

export interface UserRecord {
  userId: string;
  userName: string;
  email: string;
  mobile: string;
  role: UserRole;
  passwordHash: string;
  department: string;
  companyId: string | null; // null for SUPER_ADMIN
  companyName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

const STORAGE_TENANTS_KEY = 'printopia_tenants_v2';
const STORAGE_USERS_KEY = 'printopia_users_v2';

export const SEEDED_TENANTS: TenantCompany[] = [
  {
    id: 'company-1',
    companyCode: 'PRINTOPIA_DEMO',
    companyName: 'PRINTOPIA GRAPHICS PVT. LTD.',
    legalName: 'Printopia Graphics Private Limited',
    gstin: '19AABCP1234F1Z1',
    email: 'billing@printopia.com',
    mobile: '9830012345',
    address: 'Plot No. 42, Printing Press Area, Wagle Industrial Estate',
    city: 'Kolkata',
    state: 'West Bengal',
    stateCode: '19',
    pincode: '700001',
    status: 'ACTIVE',
    plan: 'ENTERPRISE',
    activationDate: '2026-01-01',
    expiryDate: '2028-12-31',
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 'System Super Admin'
  },
  {
    id: 'company-2',
    companyCode: 'XYZPRINT',
    companyName: 'XYZ PRINTING PRESS PVT. LTD.',
    legalName: 'XYZ Printing Press Private Limited',
    gstin: '27XYZPR1234M1Z5',
    email: 'orders@xyzprinting.com',
    mobile: '9820011111',
    address: '12 Industrial Zone, MIDC Andheri East',
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    pincode: '400093',
    status: 'ACTIVE',
    plan: 'PRO',
    activationDate: '2026-01-15',
    expiryDate: '2027-12-31',
    createdAt: '2026-01-15T00:00:00Z',
    createdBy: 'System Super Admin'
  },
  {
    id: 'company-3',
    companyCode: 'ABC_PRINTERS',
    companyName: 'ABC PRINTERS PVT. LTD.',
    legalName: 'ABC Printers Private Limited',
    gstin: '07ABCPR1234D1Z8',
    email: 'contact@abcprinters.com',
    mobile: '9810033333',
    address: 'A-45 Okhla Industrial Area Phase II',
    city: 'New Delhi',
    state: 'Delhi',
    stateCode: '07',
    pincode: '110020',
    status: 'ACTIVE',
    plan: 'PRO',
    activationDate: '2026-02-01',
    expiryDate: '2027-12-31',
    createdAt: '2026-02-01T00:00:00Z',
    createdBy: 'System Super Admin'
  },
  {
    id: 'company-suspended',
    companyCode: 'SUSPENDED_DEMO',
    companyName: 'SUSPENDED PRESS CO.',
    legalName: 'Suspended Press Co. Pvt. Ltd.',
    gstin: '33SUSP1234F1Z0',
    email: 'admin@suspended.test',
    mobile: '9840044444',
    address: '88 Industrial Estate, Guindy',
    city: 'Chennai',
    state: 'Tamil Nadu',
    stateCode: '33',
    pincode: '600032',
    status: 'SUSPENDED',
    plan: 'STARTER',
    activationDate: '2026-01-01',
    expiryDate: '2026-06-01',
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 'System Super Admin'
  }
];

export const SEEDED_USERS: UserRecord[] = [
  // Super Admin
  {
    userId: 'usr-super-admin',
    userName: 'Super Admin',
    email: 'superadmin@printopia.com',
    mobile: '9999999999',
    role: 'SUPER_ADMIN',
    passwordHash: 'super123',
    department: 'Global Administration',
    companyId: null,
    companyName: 'System Super Admin',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z'
  },
  // Company 1 Users
  {
    userId: 'usr-admin-comp1',
    userName: 'Subir Ghosal',
    email: 'admin@printopia.com',
    mobile: '9830012345',
    role: 'COMPANY_ADMIN',
    passwordHash: 'admin123',
    department: 'Executive Management',
    companyId: 'company-1',
    companyName: 'PRINTOPIA GRAPHICS PVT. LTD.',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    userId: 'usr-sales-comp1',
    userName: 'Rajesh Sharma',
    email: 'sales@printopia.com',
    mobile: '9830023456',
    role: 'SALES_EXECUTIVE',
    passwordHash: 'sales123',
    department: 'Sales & Commercial',
    companyId: 'company-1',
    companyName: 'PRINTOPIA GRAPHICS PVT. LTD.',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    userId: 'usr-designer-comp1',
    userName: 'Priya Patel',
    email: 'designer@printopia.com',
    mobile: '9830034567',
    role: 'DESIGNER',
    passwordHash: 'design123',
    department: 'Pre-Press & Design',
    companyId: 'company-1',
    companyName: 'PRINTOPIA GRAPHICS PVT. LTD.',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    userId: 'usr-printer-comp1',
    userName: 'Amit Kumar',
    email: 'printer@printopia.com',
    mobile: '9830045678',
    role: 'PRINTER',
    passwordHash: 'print123',
    department: 'Pressroom Production',
    companyId: 'company-1',
    companyName: 'PRINTOPIA GRAPHICS PVT. LTD.',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    userId: 'usr-accounts-comp1',
    userName: 'Sanjay Mehta',
    email: 'accounts@printopia.com',
    mobile: '9830056789',
    role: 'ACCOUNTS',
    passwordHash: 'accounts123',
    department: 'Finance & Accounts',
    companyId: 'company-1',
    companyName: 'PRINTOPIA GRAPHICS PVT. LTD.',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z'
  },
  // Company 2 Users (XYZ)
  {
    userId: 'usr-admin-xyz',
    userName: 'Vikram Shah',
    email: 'admin@xyz.test',
    mobile: '9820011111',
    role: 'COMPANY_ADMIN',
    passwordHash: 'admin123',
    department: 'Management',
    companyId: 'company-2',
    companyName: 'XYZ PRINTING PRESS PVT. LTD.',
    status: 'ACTIVE',
    createdAt: '2026-01-15T00:00:00Z'
  },
  {
    userId: 'usr-sales-xyz',
    userName: 'Anil Kapoor',
    email: 'sales@xyzprinting.com',
    mobile: '9820022222',
    role: 'SALES_EXECUTIVE',
    passwordHash: 'sales123',
    department: 'Sales',
    companyId: 'company-2',
    companyName: 'XYZ PRINTING PRESS PVT. LTD.',
    status: 'ACTIVE',
    createdAt: '2026-01-15T00:00:00Z'
  },
  // Company 3 Users (ABC)
  {
    userId: 'usr-admin-abc',
    userName: 'Ramesh Verma',
    email: 'admin@abc.test',
    mobile: '9810033333',
    role: 'COMPANY_ADMIN',
    passwordHash: 'admin123',
    department: 'Executive Management',
    companyId: 'company-3',
    companyName: 'ABC PRINTERS PVT. LTD.',
    status: 'ACTIVE',
    createdAt: '2026-02-01T00:00:00Z'
  },
  // Company Suspended User
  {
    userId: 'usr-admin-suspended',
    userName: 'Suresh Raina',
    email: 'admin@suspended.test',
    mobile: '9840044444',
    role: 'COMPANY_ADMIN',
    passwordHash: 'admin123',
    department: 'Management',
    companyId: 'company-suspended',
    companyName: 'SUSPENDED PRESS CO.',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z'
  }
];

export class TenantService {
  private static init(): void {
    if (!localStorage.getItem(STORAGE_TENANTS_KEY)) {
      localStorage.setItem(STORAGE_TENANTS_KEY, JSON.stringify(SEEDED_TENANTS));
    }
    if (!localStorage.getItem(STORAGE_USERS_KEY)) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(SEEDED_USERS));
    }
  }

  // --- TENANT MANAGEMENT ---
  public static getAllTenants(): TenantCompany[] {
    this.init();
    const raw = localStorage.getItem(STORAGE_TENANTS_KEY);
    return raw ? JSON.parse(raw) : SEEDED_TENANTS;
  }

  public static getTenantById(id: string): TenantCompany | null {
    const tenants = this.getAllTenants();
    return tenants.find((t) => t.id === id) || null;
  }

  public static saveTenant(company: Omit<TenantCompany, 'id' | 'createdAt'> & { id?: string }): TenantCompany {
    this.init();
    const tenants = this.getAllTenants();
    const now = new Date().toISOString();

    if (company.id) {
      const idx = tenants.findIndex((t) => t.id === company.id);
      if (idx !== -1) {
        const updated: TenantCompany = {
          ...tenants[idx],
          ...company,
          id: company.id
        };
        tenants[idx] = updated;
        localStorage.setItem(STORAGE_TENANTS_KEY, JSON.stringify(tenants));
        return updated;
      }
    }

    const newId = `company-${Date.now()}`;
    const newTenant: TenantCompany = {
      ...company,
      id: newId,
      createdAt: now
    };
    tenants.push(newTenant);
    localStorage.setItem(STORAGE_TENANTS_KEY, JSON.stringify(tenants));
    return newTenant;
  }

  public static updateTenantStatus(id: string, status: TenantStatus): TenantCompany {
    const tenants = this.getAllTenants();
    const idx = tenants.findIndex((t) => t.id === id);
    if (idx === -1) {
      throw new Error(`Tenant with ID ${id} not found.`);
    }

    tenants[idx].status = status;
    localStorage.setItem(STORAGE_TENANTS_KEY, JSON.stringify(tenants));
    return tenants[idx];
  }

  // --- USER MANAGEMENT ---
  public static getAllUsers(): UserRecord[] {
    this.init();
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    return raw ? JSON.parse(raw) : SEEDED_USERS;
  }

  public static getUsersByCompanyId(companyId: string): UserRecord[] {
    const users = this.getAllUsers();
    return users.filter((u) => u.companyId === companyId);
  }

  public static getUserByEmailOrMobile(identifier: string): UserRecord | null {
    const users = this.getAllUsers();
    const clean = identifier.trim().toLowerCase();
    const digits = identifier.replace(/\D/g, '').slice(-10);

    return users.find(
      (u) =>
        u.email.toLowerCase() === clean ||
        (digits.length === 10 && u.mobile.replace(/\D/g, '').slice(-10) === digits)
    ) || null;
  }

  public static saveUser(userData: Partial<UserRecord> & { email: string; companyId: string | null }): UserRecord {
    this.init();
    const users = this.getAllUsers();
    const now = new Date().toISOString();
    const cleanEmail = userData.email.trim().toLowerCase();

    const idx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);

    if (idx !== -1) {
      const updated: UserRecord = {
        ...users[idx],
        ...userData,
        email: cleanEmail
      };
      users[idx] = updated;
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
      return updated;
    }

    const newUser: UserRecord = {
      userId: `usr-${Date.now()}`,
      userName: userData.userName || cleanEmail.split('@')[0],
      email: userData.email,
      mobile: userData.mobile || '',
      role: userData.role || 'SALES_EXECUTIVE',
      passwordHash: userData.passwordHash || 'password123',
      department: userData.department || 'Operations',
      companyId: userData.companyId,
      companyName: userData.companyName,
      status: userData.status || 'ACTIVE',
      createdAt: now
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    return newUser;
  }

  public static updateUserStatus(userId: string, status: 'ACTIVE' | 'INACTIVE'): UserRecord {
    const users = this.getAllUsers();
    const idx = users.findIndex((u) => u.userId === userId);
    if (idx === -1) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    users[idx].status = status;
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    return users[idx];
  }

  public static resetUserPassword(userId: string, newPasswordHash: string): void {
    const users = this.getAllUsers();
    const idx = users.findIndex((u) => u.userId === userId);
    if (idx !== -1) {
      users[idx].passwordHash = newPasswordHash;
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    }
  }

  public static deleteUser(userId: string): void {
    const users = this.getAllUsers();
    const filtered = users.filter((u) => u.userId !== userId);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(filtered));
  }
}
