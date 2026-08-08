const fs = require('fs');
let file = fs.readFileSync('src/features/finance/components/Reports/ReconciliationCenter.tsx', 'utf8');

file = file.replace(/<\/Grid><\/Grid>\s*<\/Box>\s*\}\);/g, "</Grid>\n      </Grid>\n    </Box>\n  );\n}");

fs.writeFileSync('src/features/finance/components/Reports/ReconciliationCenter.tsx', file);
