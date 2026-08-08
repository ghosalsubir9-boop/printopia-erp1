const fs = require('fs');
let file2 = fs.readFileSync('src/features/finance/services/voucherRepositories.ts', 'utf8');
file2 = file2.replace(/const sType = type;/g, "const sType: any = type;");
fs.writeFileSync('src/features/finance/services/voucherRepositories.ts', file2);
