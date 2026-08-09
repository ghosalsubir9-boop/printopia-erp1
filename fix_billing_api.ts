import fs from 'fs';
let code = fs.readFileSync('src/features/billing/api.ts', 'utf-8');

code = code.replace(/specification: dcItem\.specification,\n/g, '');
code = code.replace(/&& i\.specification === item\.specification\)\)/g, '))');
code = code.replace(/const firstGstin = customer\.gstinRecords\?\.\[0\]\?\.gstin;/g, 'const firstGstin = customer.gstin;');
code = code.replace(/customer\.displayName \|\| /g, '');
code = code.replace(/customer\.billingAddresses\?\.\[0\]\?\.address/g, 'customer.billingAddress');
code = code.replace(/customer\.shippingAddresses\?\.\[0\]\?\.address/g, 'customer.shippingAddress');
code = code.replace(/customer\.gstinRecords\?\.\[0\]\?\.gstin/g, 'customer.gstin');
code = code.replace(/customer\.gstinRecords\?\.\[0\]\?\.state \|\| ''/g, 'customerStateCode');

fs.writeFileSync('src/features/billing/api.ts', code);
