const fs = require('fs');
let file = fs.readFileSync('src/features/finance/services/repositories.ts', 'utf8');

file = file.replace(/description: 'Physical cash balance', cashFlowCategory: 'Cash and Cash Equivalents'/g, 
  "description: 'Physical cash balance', cashFlowCategory: 'Cash and Cash Equivalents', ledgerCategory: 'Cash'");
  
file = file.replace(/description: 'Primary bank accounts', cashFlowCategory: 'Cash and Cash Equivalents'/g, 
  "description: 'Primary bank accounts', cashFlowCategory: 'Cash and Cash Equivalents', ledgerCategory: 'Bank'");

file = file.replace(/description: 'Output Central GST'/g, "description: 'Output Central GST', ledgerCategory: 'Tax'");
file = file.replace(/description: 'Output State GST'/g, "description: 'Output State GST', ledgerCategory: 'Tax'");
file = file.replace(/description: 'Output Integrated GST'/g, "description: 'Output Integrated GST', ledgerCategory: 'Tax'");

file = file.replace(/description: 'Input Central GST Credit'/g, "description: 'Input Central GST Credit', ledgerCategory: 'Tax'");
file = file.replace(/description: 'Input State GST Credit'/g, "description: 'Input State GST Credit', ledgerCategory: 'Tax'");
file = file.replace(/description: 'Input Integrated GST Credit'/g, "description: 'Input Integrated GST Credit', ledgerCategory: 'Tax'");

fs.writeFileSync('src/features/finance/services/repositories.ts', file);
