/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProductStatus = 'Active' | 'Inactive';

export interface ProductSizes {
  openWidth: number;
  openHeight: number;
  closeWidth: number;
  closeHeight: number;
  finishedWidth: number;
  finishedHeight: number;
}

export interface PrintOptions {
  side: 'Single Side' | 'Both Side' | 'Custom';
  colors: '1 Color' | '2 Color' | '4 Color' | 'Custom Colors';
  customColorsText?: string;
}

export interface PaperOptionsConfig {
  paperTypes: string[]; // Configurable paper type names/labels, e.g. ["Art Paper", "Maplitho"]
  gsms: number[]; // GSM values, e.g. [80, 130, 170, 300]
  parentSheets: string[]; // Parent sheet sizes, e.g. ["23x36", "18x23"]
}

export type FileAccessoriesType = 'None' | 'Clip' | 'Pocket' | 'Clip + Pocket';

export interface SpecialProductOptions {
  // Lab Envelope
  window?: boolean;
  windowSize?: string;
  gumming?: boolean;
  punch?: boolean;
  dieRequired?: boolean;
  
  // OPD File
  pocket?: boolean;
  plasticClip?: boolean;
  pocketAndClip?: boolean;
  
  // Report Pad
  bondPaper?: boolean;
  maplithoPaper?: boolean;
  padding?: boolean;
  perforation?: boolean;
  numbering?: boolean;
  
  // Bill Book
  duplicate?: boolean;
  triplicate?: boolean;
  
  // Flyer
  foldType?: string; // e.g. "Bi-Fold", "Tri-Fold", "Z-Fold"
  
  // Letterhead
  plain?: boolean;
  logoPosition?: string; // e.g. "Top Left", "Top Center", "Top Right"
}

export interface ProductCategory {
  id: string;
  name: string; // e.g. "Hospital Printing", "Commercial Printing", "Packaging", "Stationery", "Custom"
  code: string; // e.g. "HOS", "COM", "PKG", "STA", "CST"
  description?: string;
  createdAt: string;
}

export interface ProductMasterItem {
  id: string;
  productName: string;
  productCode: string; // Unique
  categoryId: string; // Ref to ProductCategory
  status: ProductStatus;
  description?: string;
  
  sizes: ProductSizes;
  printOptions: PrintOptions;
  paperOptions: PaperOptionsConfig;
  specialOptions: SpecialProductOptions;
  finishingOptions: string[]; // e.g. ["Lamination", "Matt Lamination", "UV", "Spot UV"]
  fileAccessoriesEnabled?: boolean;
  fileAccessoriesMandatory?: boolean;
  defaultClipCost?: number;
  defaultPocketCost?: number;
  hsnCode?: string;
  defaultGstRate?: number;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ProductTemplate {
  id: string;
  templateName: string;
  categoryId: string;
  defaultSizes: ProductSizes;
  defaultPrintOptions: PrintOptions;
  defaultPaperOptions: PaperOptionsConfig;
  defaultFinishingOptions: string[];
  defaultSpecialOptions: SpecialProductOptions;
  createdAt: string;
}

export interface PostgreSQLSchema {
  tableName: string;
  ddl: string;
}
