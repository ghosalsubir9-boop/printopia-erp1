/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProductMasterItem,
  ProductCategory,
  ProductTemplate,
  ProductSizes,
  PrintOptions,
  PaperOptionsConfig,
  SpecialProductOptions,
  PostgreSQLSchema
} from '../types';
import { AuthService } from '../../../services/authService';

// Helper to simulate network latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// LocalStorage Keys
const KEYS = {
  PRODUCTS: 'printopia_product_master',
  CATEGORIES: 'printopia_product_categories',
  TEMPLATES: 'printopia_product_templates'
};

// ====================================================
// PRODUCT CODE STANDARDIZATION HELPERS
// ====================================================

export const STANDARD_PREFIX_MAP: { [key: string]: string } = {
  'prescription pad': 'PP',
  'lab envelope': 'LE',
  'opd file': 'OF',
  'report pad': 'RP',
  'bill book': 'BB',
  'cash memo': 'CM',
  'letterhead': 'LH',
  'visiting card': 'VC',
  'file folder': 'FF',
  'sticker label': 'SL',
  'test report file': 'TR',
  'x-ray envelope': 'XE',
  'receipt book': 'RB',
  'brochure': 'BR',
  'flex banner': 'FB',
  'paper bag': 'PB',
  'pp bag': 'PPB',
  'non woven bag': 'NWB'
};

export function getCategoryPrefix(productName: string, categoryName: string, categoryCode: string): string {
  const nameLower = (productName || '').toLowerCase().trim();
  const catNameLower = (categoryName || '').toLowerCase().trim();

  // Sort keys by length descending to match the most specific terms first
  const sortedKeys = Object.keys(STANDARD_PREFIX_MAP).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    if (nameLower.includes(key) || catNameLower.includes(key)) {
      return STANDARD_PREFIX_MAP[key];
    }
  }

  // Fallback: If Category Code exists, use it. E.g., HOS, COM, STA, PKG.
  if (categoryCode) {
    return categoryCode.toUpperCase().trim();
  }

  return 'PRD';
}

export function getNextProductSequence(prefix: string, existingProducts: ProductMasterItem[]): number {
  let maxSeq = 0;
  const regex = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  
  existingProducts.forEach((p) => {
    if (p.productCode) {
      const match = p.productCode.trim().match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  });
  
  return maxSeq + 1;
}

// ====================================================
// INITIAL SEED DATA
// ====================================================

const initialCategories: ProductCategory[] = [
  { id: 'cat-hos', name: 'Hospital Printing', code: 'HOS', description: 'Medical files, prescription pads, envelope diagnostics', createdAt: new Date().toISOString() },
  { id: 'cat-com', name: 'Commercial Printing', code: 'COM', description: 'Brochures, flyers, business cards, corporate catalogs', createdAt: new Date().toISOString() },
  { id: 'cat-pkg', name: 'Packaging', code: 'PKG', description: 'Mono cartons, product sleeves, hard board packaging, bags', createdAt: new Date().toISOString() },
  { id: 'cat-sta', name: 'Stationery', code: 'STA', description: 'Letterheads, registers, notebooks, desk calendars', createdAt: new Date().toISOString() },
  { id: 'cat-cst', name: 'Custom', code: 'CST', description: 'Custom layouts, non-standard sizing printing work', createdAt: new Date().toISOString() }
];

const defaultPaperConfig: PaperOptionsConfig = {
  paperTypes: ['Art Paper', 'Maplitho', 'Executive Bond', 'Duplex Board'],
  gsms: [80, 100, 130, 170, 300],
  parentSheets: ['23x36', '20x30', '18x23']
};

const defaultFinishingOptions = [
  'Lamination', 'Matt Lamination', 'Gloss Lamination', 'UV', 'Spot UV',
  'Foiling', 'Emboss', 'Deboss', 'Die Cutting', 'Creasing', 'Folding',
  'Pasting', 'Eyelet', 'Punch', 'Binding', 'Padding', 'Numbering', 'Perforation'
];

const initialProducts: ProductMasterItem[] = [
  // --- HOSPITAL PRODUCTS ---
  {
    id: 'prod-hos-1',
    productName: 'Prescription Pad',
    productCode: 'PRD-HOS-RX',
    categoryId: 'cat-hos',
    status: 'Active',
    description: 'Standard doctor prescription pad with micro-perforated binding header.',
    sizes: { openWidth: 5.5, openHeight: 8.5, closeWidth: 5.5, closeHeight: 8.5, finishedWidth: 5.5, finishedHeight: 8.5 },
    printOptions: { side: 'Single Side', colors: '1 Color' },
    paperOptions: {
      paperTypes: ['Maplitho', 'Executive Bond'],
      gsms: [80, 90, 100],
      parentSheets: ['17x22', '18x23']
    },
    specialOptions: { maplithoPaper: true, padding: true, perforation: true, numbering: true },
    finishingOptions: ['Padding', 'Perforation', 'Numbering'],
    hsnCode: '4901',
    defaultGstRate: 12, // Prescription pads can be 12% sometimes, but user said default 18% for commercial.
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    createdBy: 'subir.ghosal',
    updatedBy: 'subir.ghosal'
  },
  {
    id: 'prod-hos-2',
    productName: 'Lab Envelope',
    productCode: 'PRD-HOS-ENV',
    categoryId: 'cat-hos',
    status: 'Active',
    description: 'Diagnostically configured diagnostic lab window envelope with gumming flap.',
    sizes: { openWidth: 9.5, openHeight: 11.5, closeWidth: 4.5, closeHeight: 9.5, finishedWidth: 4.5, finishedHeight: 9.5 },
    printOptions: { side: 'Single Side', colors: '2 Color' },
    paperOptions: {
      paperTypes: ['Maplitho', 'Kraft Paper'],
      gsms: [80, 100, 120],
      parentSheets: ['23x36', '20x30']
    },
    specialOptions: { window: true, windowSize: '3.5 x 1.5 inches', gumming: true, punch: false, dieRequired: true },
    finishingOptions: ['Die Cutting', 'Pasting', 'Punching'],
    hsnCode: '4817',
    defaultGstRate: 18,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    createdBy: 'subir.ghosal',
    updatedBy: 'subir.ghosal'
  },
  {
    id: 'prod-hos-3',
    productName: 'OPD File Folder',
    productCode: 'PRD-HOS-OPD',
    categoryId: 'cat-hos',
    status: 'Active',
    description: 'Cardboard OPD medical file folders with pocket attachment and plastic clip bindings.',
    sizes: { openWidth: 19.0, openHeight: 13.0, closeWidth: 9.5, closeHeight: 13.0, finishedWidth: 9.5, finishedHeight: 13.0 },
    printOptions: { side: 'Both Side', colors: '4 Color' },
    paperOptions: {
      paperTypes: ['Art Card', 'Duplex Board'],
      gsms: [250, 300, 350],
      parentSheets: ['23x36', '28x40']
    },
    specialOptions: { pocket: true, plasticClip: true, pocketAndClip: true, dieRequired: true },
    finishingOptions: ['Matt Lamination', 'Die Cutting', 'Creasing', 'Pasting'],
    hsnCode: '4820',
    defaultGstRate: 18,
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    createdBy: 'subir.ghosal',
    updatedBy: 'subir.ghosal'
  },
  {
    id: 'prod-hos-4',
    productName: 'X-Ray Envelope (Large)',
    productCode: 'PRD-HOS-XRAY',
    categoryId: 'cat-hos',
    status: 'Active',
    description: 'Heavy duty Kraft paper envelope designed to protect and transport radiology diagnostic films.',
    sizes: { openWidth: 15.0, openHeight: 18.0, closeWidth: 15.0, closeHeight: 18.0, finishedWidth: 15.0, finishedHeight: 18.0 },
    printOptions: { side: 'Single Side', colors: '1 Color' },
    paperOptions: {
      paperTypes: ['Kraft Paper', 'Maplitho'],
      gsms: [100, 120, 150],
      parentSheets: ['23x36', '28x40']
    },
    specialOptions: { gumming: true, punch: true, dieRequired: false },
    finishingOptions: ['Pasting', 'Punching'],
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    createdBy: 'subir.ghosal',
    updatedBy: 'subir.ghosal'
  },
  {
    id: 'prod-hos-5',
    productName: 'Report Pad',
    productCode: 'PRD-HOS-REP',
    categoryId: 'cat-hos',
    status: 'Active',
    description: 'Pathology diagnostic laboratory output printing pad, lined with bond paper and top padding.',
    sizes: { openWidth: 8.27, openHeight: 11.69, closeWidth: 8.27, closeHeight: 11.69, finishedWidth: 8.27, finishedHeight: 11.69 },
    printOptions: { side: 'Single Side', colors: '2 Color' },
    paperOptions: {
      paperTypes: ['Maplitho', 'Executive Bond'],
      gsms: [80, 90, 100],
      parentSheets: ['23x36', '18x23']
    },
    specialOptions: { bondPaper: true, padding: true, perforation: false },
    finishingOptions: ['Padding'],
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    createdBy: 'subir.ghosal',
    updatedBy: 'subir.ghosal'
  },
  {
    id: 'prod-hos-6',
    productName: 'Patient Bill Book',
    productCode: 'PRD-HOS-BILL',
    categoryId: 'cat-hos',
    status: 'Active',
    description: 'Carbonless patient checkout duplicate bill books with serial numbering.',
    sizes: { openWidth: 5.5, openHeight: 8.5, closeWidth: 5.5, closeHeight: 8.5, finishedWidth: 5.5, finishedHeight: 8.5 },
    printOptions: { side: 'Single Side', colors: '1 Color' },
    paperOptions: {
      paperTypes: ['NCR Carbonless', 'Maplitho'],
      gsms: [55, 60, 70],
      parentSheets: ['17x22', '18x23']
    },
    specialOptions: { duplicate: true, numbering: true, perforation: true },
    finishingOptions: ['Padding', 'Perforation', 'Numbering'],
    createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 11 * 86400000).toISOString(),
    createdBy: 'subir.ghosal',
    updatedBy: 'subir.ghosal'
  },

  // --- COMMERCIAL PRODUCTS ---
  {
    id: 'prod-com-1',
    productName: 'Corporate Brochure',
    productCode: 'PRD-COM-BRO',
    categoryId: 'cat-com',
    status: 'Active',
    description: 'Premium tri-fold corporate flyer, printed on glossy art paper.',
    sizes: { openWidth: 11.0, openHeight: 8.5, closeWidth: 3.66, closeHeight: 8.5, finishedWidth: 3.66, finishedHeight: 8.5 },
    printOptions: { side: 'Both Side', colors: '4 Color' },
    paperOptions: {
      paperTypes: ['Art Paper'],
      gsms: [130, 170, 220],
      parentSheets: ['23x36', '18x23']
    },
    specialOptions: { foldType: 'Tri-Fold' },
    finishingOptions: ['Gloss Lamination', 'Creasing', 'Folding'],
    hsnCode: '4911',
    defaultGstRate: 18,
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    createdBy: 'subir.ghosal',
    updatedBy: 'subir.ghosal'
  },
  {
    id: 'prod-com-2',
    productName: 'Visiting Card',
    productCode: 'PRD-COM-VC',
    categoryId: 'cat-com',
    status: 'Active',
    description: 'Double-sided glossy / matte executive business cards with spot UV gloss options.',
    sizes: { openWidth: 3.5, openHeight: 2.0, closeWidth: 3.5, closeHeight: 2.0, finishedWidth: 3.5, finishedHeight: 2.0 },
    printOptions: { side: 'Both Side', colors: '4 Color' },
    paperOptions: {
      paperTypes: ['Art Card', 'Ivory Card'],
      gsms: [300, 350],
      parentSheets: ['20x30', '12x18']
    },
    specialOptions: {},
    finishingOptions: ['Matt Lamination', 'Spot UV', 'Die Cutting'],
    hsnCode: '4911',
    defaultGstRate: 18,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    createdBy: 'subir.ghosal',
    updatedBy: 'subir.ghosal'
  },
  {
    id: 'prod-com-3',
    productName: 'Marketing Flyer',
    productCode: 'PRD-COM-FLY',
    categoryId: 'cat-com',
    status: 'Active',
    description: 'Bulk single-sheet handouts for standard commercial advertising.',
    sizes: { openWidth: 8.27, openHeight: 11.69, closeWidth: 8.27, closeHeight: 11.69, finishedWidth: 8.27, finishedHeight: 11.69 },
    printOptions: { side: 'Both Side', colors: '4 Color' },
    paperOptions: {
      paperTypes: ['Art Paper', 'Maplitho'],
      gsms: [90, 120, 130],
      parentSheets: ['23x36', '25x36']
    },
    specialOptions: { foldType: 'Plain / No Fold' },
    finishingOptions: [],
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    createdBy: 'subir.ghosal',
    updatedBy: 'subir.ghosal'
  },

  // --- STATIONERY ---
  {
    id: 'prod-sta-1',
    productName: 'Corporate Letterhead',
    productCode: 'PRD-STA-LH',
    categoryId: 'cat-sta',
    status: 'Active',
    description: 'Elegant corporate stationery printed with letterpress quality header branding.',
    sizes: { openWidth: 8.27, openHeight: 11.69, closeWidth: 8.27, closeHeight: 11.69, finishedWidth: 8.27, finishedHeight: 11.69 },
    printOptions: { side: 'Single Side', colors: '2 Color' },
    paperOptions: {
      paperTypes: ['Executive Bond', 'Premium Alabaster'],
      gsms: [90, 100, 120],
      parentSheets: ['23x36', '18x23']
    },
    specialOptions: { plain: true, logoPosition: 'Top Left' },
    finishingOptions: [],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    createdBy: 'subir.ghosal',
    updatedBy: 'subir.ghosal'
  }
];

const initialTemplates: ProductTemplate[] = [
  {
    id: 'temp-1',
    templateName: 'Standard Prescription Form Block',
    categoryId: 'cat-hos',
    defaultSizes: { openWidth: 5.5, openHeight: 8.5, closeWidth: 5.5, closeHeight: 8.5, finishedWidth: 5.5, finishedHeight: 8.5 },
    defaultPrintOptions: { side: 'Single Side', colors: '1 Color' },
    defaultPaperOptions: {
      paperTypes: ['Maplitho', 'Executive Bond'],
      gsms: [80, 90, 100],
      parentSheets: ['17x22', '18x23']
    },
    defaultFinishingOptions: ['Padding', 'Perforation'],
    defaultSpecialOptions: { maplithoPaper: true, padding: true, perforation: true },
    createdAt: new Date().toISOString()
  },
  {
    id: 'temp-2',
    templateName: 'Premium Mono-Carton Packaging Fold',
    categoryId: 'cat-pkg',
    defaultSizes: { openWidth: 12.0, openHeight: 14.0, closeWidth: 4.0, closeHeight: 6.0, finishedWidth: 4.0, finishedHeight: 6.0 },
    defaultPrintOptions: { side: 'Single Side', colors: '4 Color' },
    defaultPaperOptions: {
      paperTypes: ['Duplex Board', 'Bleached SBS Card'],
      gsms: [280, 300, 320, 350],
      parentSheets: ['28x40', '30x40']
    },
    defaultFinishingOptions: ['Lamination', 'Spot UV', 'Die Cutting', 'Creasing', 'Pasting'],
    defaultSpecialOptions: { dieRequired: true },
    createdAt: new Date().toISOString()
  }
];

// ====================================================
// SERVICE DEFINITION
// ====================================================

export class ProductApiService {
  
  private static getStored<T>(key: string, defaultVal: T[]): T[] {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error loading database key: ${key}`, e);
      return defaultVal;
    }
  }

  private static saveStored<T>(key: string, data: T[]) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // ==========================================
  // 1. PRODUCT MASTER API
  // ==========================================

  public static async getProducts(filters?: {
    searchTerm?: string;
    categoryId?: string;
    status?: string;
    paperType?: string;
    finishingOption?: string;
  }): Promise<ProductMasterItem[]> {
    await delay(350);
    let products = this.getStored<ProductMasterItem>(KEYS.PRODUCTS, initialProducts);
    const currentCompanyId = AuthService.getCurrentCompanyId();

    // Multi-tenant filter: global scope OR matching companyId
    products = products.filter(
      (p) => p.scope === 'GLOBAL' || p.companyId === currentCompanyId
    );

    // Rule 5: Automatically assign/migrate product codes for existing products
    let modified = false;
    const categories = this.getStored<ProductCategory>(KEYS.CATEGORIES, initialCategories);
    const codePattern = /^[A-Z]+-\d{4}$/;

    products = products.map((p) => {
      const trimmedCode = (p.productCode || '').trim().toUpperCase();
      if (!trimmedCode || !codePattern.test(trimmedCode)) {
        const cat = categories.find((c) => c.id === p.categoryId);
        const prefix = getCategoryPrefix(p.productName, cat?.name || '', cat?.code || '');
        
        // Find existing conformant products to avoid sequence collision
        const existingConformant = products.filter((other) => 
          other.id !== p.id && 
          other.productCode && 
          codePattern.test(other.productCode.trim().toUpperCase())
        );
        
        const nextSeq = getNextProductSequence(prefix, existingConformant);
        const paddedSeq = String(nextSeq).padStart(4, '0');
        p.productCode = `${prefix}-${paddedSeq}`;
        modified = true;
      } else if (p.productCode !== trimmedCode) {
        p.productCode = trimmedCode;
        modified = true;
      }
      return p;
    });

    if (modified) {
      this.saveStored(KEYS.PRODUCTS, products);
    }

    if (filters) {
      const { searchTerm, categoryId, status, paperType, finishingOption } = filters;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        products = products.filter(
          (p) =>
            p.productName.toLowerCase().includes(query) ||
            p.productCode.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query))
        );
      }

      if (categoryId && categoryId !== 'All') {
        products = products.filter((p) => p.categoryId === categoryId);
      }

      if (status && status !== 'All') {
        products = products.filter((p) => p.status === status);
      }

      if (paperType && paperType !== 'All') {
        products = products.filter((p) => p.paperOptions.paperTypes.includes(paperType));
      }

      if (finishingOption && finishingOption !== 'All') {
        products = products.filter((p) => p.finishingOptions.includes(finishingOption));
      }
    }

    return products;
  }

  public static async getProductById(id: string): Promise<ProductMasterItem | null> {
    await delay(100);
    const products = this.getStored<ProductMasterItem>(KEYS.PRODUCTS, initialProducts);
    const prod = products.find((p) => p.id === id);
    if (!prod) return null;
    if (prod.scope !== 'GLOBAL') {
      AuthService.assertTenantAccess(prod.companyId, AuthService.getCurrentUser());
    }
    return prod;
  }

  public static async createProduct(
    product: Omit<ProductMasterItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>
  ): Promise<ProductMasterItem> {
    await delay(400);
    const products = this.getStored<ProductMasterItem>(KEYS.PRODUCTS, initialProducts);

    // Validation
    if (!product.productName?.trim()) {
      throw new Error('Product Name is required.');
    }
    if (!product.categoryId) {
      throw new Error('Category is required.');
    }

    // Auto-generate if not provided or doesn't conform to pattern [PREFIX]-[4-digit sequence]
    let finalCode = (product.productCode || '').trim().toUpperCase();
    const codePattern = /^[A-Z]+-\d{4}$/;
    if (!finalCode || !codePattern.test(finalCode)) {
      const categories = this.getStored<ProductCategory>(KEYS.CATEGORIES, initialCategories);
      const cat = categories.find((c) => c.id === product.categoryId);
      const prefix = getCategoryPrefix(product.productName, cat?.name || '', cat?.code || '');
      const nextSeq = getNextProductSequence(prefix, products);
      const paddedSeq = String(nextSeq).padStart(4, '0');
      finalCode = `${prefix}-${paddedSeq}`;
    }

    const codeExists = products.some(
      (p) => p.productCode.trim().toUpperCase() === finalCode
    );
    if (codeExists) {
      throw new Error(`Product Code '${finalCode}' is already registered in the registry.`);
    }

    const companyId = AuthService.requireCurrentCompanyId();
    const currentUser = AuthService.getCurrentUser();
    const userName = currentUser?.userName || 'System';

    const newProduct: ProductMasterItem = {
      ...product,
      id: `prod-${Date.now()}`,
      companyId: companyId,
      scope: product.scope || 'TENANT',
      productCode: finalCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userName,
      updatedBy: userName
    };

    products.unshift(newProduct);
    this.saveStored(KEYS.PRODUCTS, products);
    return newProduct;
  }

  public static async updateProduct(
    id: string,
    updatedFields: Partial<ProductMasterItem>
  ): Promise<ProductMasterItem> {
    await delay(400);
    const products = this.getStored<ProductMasterItem>(KEYS.PRODUCTS, initialProducts);
    const index = products.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error(`Product with ID '${id}' not found.`);
    }

    const existing = products[index];
    if (existing.scope !== 'GLOBAL') {
      AuthService.assertTenantAccess(existing.companyId, AuthService.getCurrentUser());
    }

    // Rule 4 & 7: Product Code is read-only after creation and cannot be edited.
    // Ensure we strip out any modifications to productCode to maintain read-only discipline.
    const { productCode, ...safeFields } = updatedFields;

    const updatedProduct: ProductMasterItem = {
      ...products[index],
      ...safeFields,
      updatedAt: new Date().toISOString(),
      updatedBy: 'subir.ghosal'
    };

    products[index] = updatedProduct;
    this.saveStored(KEYS.PRODUCTS, products);
    return updatedProduct;
  }

  public static async deleteProduct(id: string): Promise<boolean> {
    await delay(300);
    const products = this.getStored<ProductMasterItem>(KEYS.PRODUCTS, initialProducts);
    const existing = products.find((p) => p.id === id);
    if (!existing) {
      throw new Error(`Product with ID '${id}' not found.`);
    }
    if (existing.scope !== 'GLOBAL') {
      AuthService.assertTenantAccess(existing.companyId, AuthService.getCurrentUser());
    }

    const filtered = products.filter((p) => p.id !== id);
    this.saveStored(KEYS.PRODUCTS, filtered);
    return true;
  }

  // ==========================================
  // 2. PRODUCT CATEGORIES API
  // ==========================================

  public static async getCategories(): Promise<ProductCategory[]> {
    await delay(150);
    return this.getStored<ProductCategory>(KEYS.CATEGORIES, initialCategories);
  }

  public static async createCategory(name: string, code: string, description?: string): Promise<ProductCategory> {
    await delay(250);
    const cats = this.getStored<ProductCategory>(KEYS.CATEGORIES, initialCategories);

    if (!name?.trim()) throw new Error('Category Name is required.');
    if (!code?.trim()) throw new Error('Category Code is required.');

    const nameExists = cats.some((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (nameExists) throw new Error(`Category name '${name}' already exists.`);

    const codeExists = cats.some((c) => c.code.toLowerCase() === code.trim().toLowerCase());
    if (codeExists) throw new Error(`Category code '${code}' already exists.`);

    const newCat: ProductCategory = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description,
      createdAt: new Date().toISOString()
    };

    cats.push(newCat);
    this.saveStored(KEYS.CATEGORIES, cats);
    return newCat;
  }

  public static async updateCategory(id: string, fields: Partial<Omit<ProductCategory, 'id' | 'createdAt'>>): Promise<ProductCategory> {
    await delay(200);
    const cats = this.getStored<ProductCategory>(KEYS.CATEGORIES, initialCategories);
    const index = cats.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Category not found.');

    if (fields.name) {
      const exists = cats.some((c) => c.name.toLowerCase() === fields.name?.trim().toLowerCase() && c.id !== id);
      if (exists) throw new Error(`Category with name '${fields.name}' already exists.`);
    }
    if (fields.code) {
      const exists = cats.some((c) => c.code.toLowerCase() === fields.code?.trim().toLowerCase() && c.id !== id);
      if (exists) throw new Error(`Category code '${fields.code}' already taken.`);
    }

    const updated = {
      ...cats[index],
      ...fields
    };
    cats[index] = updated;
    this.saveStored(KEYS.CATEGORIES, cats);
    return updated;
  }

  public static async deleteCategory(id: string): Promise<boolean> {
    await delay(200);
    const cats = this.getStored<ProductCategory>(KEYS.CATEGORIES, initialCategories);

    // Prevent deleting core categories if they are linked to products
    const products = this.getStored<ProductMasterItem>(KEYS.PRODUCTS, initialProducts);
    const inUse = products.some((p) => p.categoryId === id);
    if (inUse) {
      throw new Error('Cannot delete category. It is actively linked to products in the ERP.');
    }

    const filtered = cats.filter((c) => c.id !== id);
    this.saveStored(KEYS.CATEGORIES, filtered);
    return true;
  }

  // ==========================================
  // 3. PRODUCT TEMPLATES API
  // ==========================================

  public static async getTemplates(): Promise<ProductTemplate[]> {
    await delay(200);
    return this.getStored<ProductTemplate>(KEYS.TEMPLATES, initialTemplates);
  }

  public static async createTemplate(template: Omit<ProductTemplate, 'id' | 'createdAt'>): Promise<ProductTemplate> {
    await delay(300);
    const temps = this.getStored<ProductTemplate>(KEYS.TEMPLATES, initialTemplates);

    if (!template.templateName?.trim()) {
      throw new Error('Template Name is required.');
    }

    const newTemp: ProductTemplate = {
      ...template,
      id: `temp-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    temps.push(newTemp);
    this.saveStored(KEYS.TEMPLATES, temps);
    return newTemp;
  }

  public static async deleteTemplate(id: string): Promise<boolean> {
    await delay(150);
    const temps = this.getStored<ProductTemplate>(KEYS.TEMPLATES, initialTemplates);
    const filtered = temps.filter((t) => t.id !== id);
    this.saveStored(KEYS.TEMPLATES, filtered);
    return true;
  }

  // ==========================================
  // 4. POSTGRESQL SCHEMA DEFINITION (ADMIN METADATA)
  // ==========================================

  public static getPostgreSQLSchema(): PostgreSQLSchema[] {
    return [
      {
        tableName: 'product_category',
        ddl: `CREATE TABLE product_category (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`
      },
      {
        tableName: 'product_master',
        ddl: `CREATE TABLE product_master (
  id VARCHAR(50) PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  product_code VARCHAR(50) NOT NULL UNIQUE,
  category_id VARCHAR(50) NOT NULL REFERENCES product_category(id),
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  description TEXT,
  open_width DECIMAL(10,2) NOT NULL,
  open_height DECIMAL(10,2) NOT NULL,
  close_width DECIMAL(10,2) NOT NULL,
  close_height DECIMAL(10,2) NOT NULL,
  finished_width DECIMAL(10,2) NOT NULL,
  finished_height DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100) NOT NULL,
  updated_by VARCHAR(100) NOT NULL
);`
      },
      {
        tableName: 'product_print_option',
        ddl: `CREATE TABLE product_print_option (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(50) NOT NULL REFERENCES product_master(id) ON DELETE CASCADE,
  print_side VARCHAR(50) NOT NULL, -- 'Single Side', 'Both Side', 'Custom'
  print_colors VARCHAR(50) NOT NULL, -- '1 Color', '2 Color', '4 Color', 'Custom'
  custom_colors_text VARCHAR(255)
);`
      },
      {
        tableName: 'product_paper_option',
        ddl: `CREATE TABLE product_paper_option (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(50) NOT NULL REFERENCES product_master(id) ON DELETE CASCADE,
  paper_type VARCHAR(100) NOT NULL,
  gsm_values INTEGER[] NOT NULL,
  parent_sheets VARCHAR(50)[] NOT NULL
);`
      },
      {
        tableName: 'product_finishing_option',
        ddl: `CREATE TABLE product_finishing_option (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(50) NOT NULL REFERENCES product_master(id) ON DELETE CASCADE,
  finishing_option VARCHAR(100) NOT NULL -- e.g. 'Lamination', 'Matt Lamination', 'UV', 'Spot UV', etc.
);`
      },
      {
        tableName: 'product_template',
        ddl: `CREATE TABLE product_template (
  id VARCHAR(50) PRIMARY KEY,
  template_name VARCHAR(255) NOT NULL,
  category_id VARCHAR(50) NOT NULL REFERENCES product_category(id),
  default_sizes JSONB NOT NULL,
  default_print_options JSONB NOT NULL,
  default_paper_options JSONB NOT NULL,
  default_finishing_options TEXT[] NOT NULL,
  default_special_options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`
      }
    ];
  }
}
