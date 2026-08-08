const fs = require('fs');
let file = fs.readFileSync('src/features/finance/types/index.ts', 'utf8');

file = file.replace(/export interface AccountGroup \{/, `export interface AccountGroup {
  statementType?: 'P&L' | 'Balance Sheet';
  directOrIndirect?: 'Direct' | 'Indirect';
  cashFlowCategory?: 'Operating' | 'Investing' | 'Financing' | 'Cash and Cash Equivalents';`);

file = file.replace(/export interface COAAccount \{/, `export interface COAAccount {
  statementType?: 'P&L' | 'Balance Sheet';
  directOrIndirect?: 'Direct' | 'Indirect';
  cashFlowCategory?: 'Operating' | 'Investing' | 'Financing' | 'Cash and Cash Equivalents';`);

fs.writeFileSync('src/features/finance/types/index.ts', file);
