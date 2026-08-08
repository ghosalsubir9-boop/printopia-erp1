const fs = require('fs');
let file = fs.readFileSync('src/features/purchase-invoice/services/api.ts', 'utf8');

file = file.replace(/baseAmount: invoice.taxableValue,\s*taxAmount: \(invoice.cgst \|\| 0\) \+ \(invoice.sgst \|\| 0\) \+ \(invoice.igst \|\| 0\)/g, 
`taxableAmount: invoice.taxableValue,
        cgstAmount: invoice.cgst,
        sgstAmount: invoice.sgst,
        igstAmount: invoice.igst,
        roundOffAmount: invoice.roundOff`);

file = file.replace(/baseAmount: newCN.taxableValue,\s*taxAmount: \(newCN.cgst \|\| 0\) \+ \(newCN.sgst \|\| 0\) \+ \(newCN.igst \|\| 0\)/g, 
`taxableAmount: newCN.taxableValue,
        cgstAmount: newCN.cgst,
        sgstAmount: newCN.sgst,
        igstAmount: newCN.igst,
        roundOffAmount: newCN.roundOff`);

file = file.replace(/baseAmount: newDN.taxableValue,\s*taxAmount: \(newDN.cgst \|\| 0\) \+ \(newDN.sgst \|\| 0\) \+ \(newDN.igst \|\| 0\)/g, 
`taxableAmount: newDN.taxableValue,
        cgstAmount: newDN.cgst,
        sgstAmount: newDN.sgst,
        igstAmount: newDN.igst,
        roundOffAmount: newDN.roundOff`);


fs.writeFileSync('src/features/purchase-invoice/services/api.ts', file);
