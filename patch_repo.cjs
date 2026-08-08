const fs = require('fs');
let file = fs.readFileSync('src/features/finance/services/repositories.ts', 'utf8');

file = file.replace(/nature: 'Assets', active: true/g, "nature: 'Assets', statementType: 'Balance Sheet', active: true");
file = file.replace(/nature: 'Liabilities', active: true/g, "nature: 'Liabilities', statementType: 'Balance Sheet', active: true");
file = file.replace(/nature: 'Equity', active: true/g, "nature: 'Equity', statementType: 'Balance Sheet', active: true");
file = file.replace(/nature: 'Income', active: true/g, "nature: 'Income', statementType: 'P&L', active: true");
file = file.replace(/nature: 'Expenses', active: true/g, "nature: 'Expenses', statementType: 'P&L', active: true");

// Update 'INC-DIR' to direct
file = file.replace(/{ code: 'INC-DIR', name: 'Direct Income', parentCode: 'INC', nature: 'Income', statementType: 'P&L', active: true, description: 'Core printing sales revenue' }/, 
"{ code: 'INC-DIR', name: 'Direct Income', parentCode: 'INC', nature: 'Income', statementType: 'P&L', directOrIndirect: 'Direct', active: true, description: 'Core printing sales revenue' }");

file = file.replace(/{ code: 'INC-IND', name: 'Indirect Income', parentCode: 'INC', nature: 'Income', statementType: 'P&L', active: true, description: 'Interest, scrap sales, other income' }/, 
"{ code: 'INC-IND', name: 'Indirect Income', parentCode: 'INC', nature: 'Income', statementType: 'P&L', directOrIndirect: 'Indirect', active: true, description: 'Interest, scrap sales, other income' }");

file = file.replace(/{ code: 'EXP-DIR', name: 'Direct Expenses', parentCode: 'EXP', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Paper, plates, ink, labour costs' }/, 
"{ code: 'EXP-DIR', name: 'Direct Expenses', parentCode: 'EXP', nature: 'Expenses', statementType: 'P&L', directOrIndirect: 'Direct', active: true, description: 'Paper, plates, ink, labour costs' }");

file = file.replace(/{ code: 'EXP-IND', name: 'Indirect Expenses', parentCode: 'EXP', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Rent, electricity, office expenses' }/, 
"{ code: 'EXP-IND', name: 'Indirect Expenses', parentCode: 'EXP', nature: 'Expenses', statementType: 'P&L', directOrIndirect: 'Indirect', active: true, description: 'Rent, electricity, office expenses' }");

// Cash Flow Categories
file = file.replace(/code: 'AST-CUR'.*?Cash, bank, receivables, inventory/g, function(match) { return match + "' , cashFlowCategory: 'Cash and Cash Equivalents' "; });
file = file.replace(/accountCode: 'AST-CASH-01'.*?Physical cash balance/g, function(match) { return match + "' , cashFlowCategory: 'Cash and Cash Equivalents' "; });
file = file.replace(/accountCode: 'AST-BANK-01'.*?Primary bank accounts/g, function(match) { return match + "' , cashFlowCategory: 'Cash and Cash Equivalents' "; });


fs.writeFileSync('src/features/finance/services/repositories.ts', file);
