const fs = require('fs');
let file = fs.readFileSync('src/features/billing/api.ts', 'utf8');

file = file.replace(/baseAmount: inv.taxableAmount,\s*taxAmount: \(inv.cgst \|\| 0\) \+ \(inv.sgst \|\| 0\) \+ \(inv.igst \|\| 0\)/g, 
`taxableAmount: inv.taxableAmount,
        cgstAmount: inv.cgst,
        sgstAmount: inv.sgst,
        igstAmount: inv.igst,
        roundOffAmount: inv.roundOff`);

file = file.replace(/baseAmount: newCn.taxableAmount,\s*taxAmount: \(newCn.cgst \|\| 0\) \+ \(newCn.sgst \|\| 0\) \+ \(newCn.igst \|\| 0\)/g, 
`taxableAmount: newCn.taxableAmount,
        cgstAmount: newCn.cgst,
        sgstAmount: newCn.sgst,
        igstAmount: newCn.igst,
        roundOffAmount: newCn.roundOff`);

fs.writeFileSync('src/features/billing/api.ts', file);
