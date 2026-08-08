const fs = require('fs');

let file = fs.readFileSync('src/features/finance/components/FinanceHub.tsx', 'utf8');

file = file.replace(/accountingMethod: e\.target\.value as 'Auto' \| 'Up' \| 'Down'/g, "accountingMethod: e.target.value as 'Accrual' | 'Cash'");
file = file.replace(/defaultGstMethod: e\.target\.value as 'Auto' \| 'Up' \| 'Down'/g, "defaultGstMethod: e.target.value as 'Accrual' | 'Cash'");
file = file.replace(/openingBalanceType: e\.target\.value as 'Auto' \| 'Up' \| 'Down'/g, "openingBalanceType: e.target.value as 'Dr' | 'Cr'");

fs.writeFileSync('src/features/finance/components/FinanceHub.tsx', file);
