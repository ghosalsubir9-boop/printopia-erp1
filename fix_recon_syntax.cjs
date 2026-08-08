const fs = require('fs');

let file = fs.readFileSync('src/features/finance/components/Reports/ReconciliationCenter.tsx', 'utf8');
file = file.replace(/<\/Grid>\s*<Grid size=\{\{ xs: 12, md: 12 \}\}>\s*<Card variant="outlined">/g, 
  "</Grid>\n<Grid size={{ xs: 12, md: 12 }}>\n<Card variant=\"outlined\">");

fs.writeFileSync('src/features/finance/components/Reports/ReconciliationCenter.tsx', file);
