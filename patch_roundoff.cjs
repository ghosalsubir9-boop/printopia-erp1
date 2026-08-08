const fs = require('fs');

let f1 = fs.readFileSync('src/features/billing/api.ts', 'utf8');
f1 = f1.replace(/roundOffAmount: newCn\.roundOff/g, 'roundOffAmount: 0');
fs.writeFileSync('src/features/billing/api.ts', f1);

let f2 = fs.readFileSync('src/features/finance/services/AutoPostingEngine.ts', 'utf8');
f2 = f2.replace(/taxAmount: \(inv.cgst \|\| 0\) \+ \(inv.sgst \|\| 0\) \+ \(inv.igst \|\| 0\)/g, 'taxableAmount: inv.taxableAmount, cgstAmount: inv.cgst'); // wait, let's just replace taxAmount access
f2 = f2.replace(/req.taxAmount/g, 'req.taxableAmount'); 
fs.writeFileSync('src/features/finance/services/AutoPostingEngine.ts', f2);

let f3 = fs.readFileSync('src/features/purchase-invoice/services/api.ts', 'utf8');
f3 = f3.replace(/roundOffAmount: newCN\.roundOff/g, 'roundOffAmount: 0');
f3 = f3.replace(/roundOffAmount: newDN\.roundOff/g, 'roundOffAmount: 0');
fs.writeFileSync('src/features/purchase-invoice/services/api.ts', f3);
