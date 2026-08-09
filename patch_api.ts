import fs from 'fs';
const file = fs.readFileSync('src/features/billing/api.ts', 'utf-8');

// Insert import at top
let out = file.replace(
  "import { AutoPostingEngine } from '../finance/services/AutoPostingEngine';",
  "import { AutoPostingEngine } from '../finance/services/AutoPostingEngine';\nimport { CompanySettingsService } from '../../services/CompanySettingsService';"
);

// We'll write this script to patch the billing API
fs.writeFileSync('src/features/billing/api.ts', out);
