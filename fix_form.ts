import fs from 'fs';
let code = fs.readFileSync('src/features/billing/components/CreateInvoiceForm.tsx', 'utf-8');

code = code.replace(/sourceQuotationOptionId,/g, '/*sourceQuotationOptionId,*/');

// fix line 332 missing properties
const replaceItems = `const newItem: GSTInvoiceItem = {
      id: \`item-\${Math.random().toString(36).substr(2, 9)}\`,
      productName: '',
      description: '',
      hsnSac: '49011010',
      quantity: 1000,
      unit: 'Pcs',
      ratePerPiece: 1.0,
      discount: 0,
      taxableAmount: 1000,
      gstRate: 18,
      cgst: 0,
      sgst: 0,
      igst: 0,
      itemAmount: 1180,
      orderedQty: 1000,
      previouslyInvoicedQty: 0
    };`;
code = code.replace(/const newItem: GSTInvoiceItem = \{[\s\S]*?previouslyInvoicedQty: 0\n\s*\};/, replaceItems);

// and also in line 180 (for PI) and 310 (for DC)
const replacePIItem = `taxableAmount: itemTaxable,
        gstRate: piItem.gstRate || 18,
        cgst: 0,
        sgst: 0,
        igst: 0,
        itemAmount: amt,
        orderedQty,
        previouslyInvoicedQty,
        sourcePiItemId: piItem.id`;
code = code.replace(/taxableAmount: itemTaxable,\n\s*gstRate: piItem\.gstRate \|\| 18,\n\s*itemAmount: amt,\n\s*orderedQty,\n\s*previouslyInvoicedQty,\n\s*sourcePiItemId: piItem\.id/, replacePIItem);

const replaceDCItem = `taxableAmount: amt,
        gstRate: 18,
        cgst: 0,
        sgst: 0,
        igst: 0,
        itemAmount: amt,
        orderedQty,
        previouslyInvoicedQty,`;
code = code.replace(/taxableAmount: amt,\n\s*gstRate: 18,\n\s*itemAmount: amt,\n\s*orderedQty,\n\s*previouslyInvoicedQty,/, replaceDCItem);

fs.writeFileSync('src/features/billing/components/CreateInvoiceForm.tsx', code);
