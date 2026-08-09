import fs from 'fs';
let code = fs.readFileSync('src/features/billing/types.ts', 'utf-8');

code = code.replace(/proformaInvoiceId\?: string;/g, 'proformaInvoiceId?: string;\n  sourcePiItemId?: string;');

fs.writeFileSync('src/features/billing/types.ts', code);
