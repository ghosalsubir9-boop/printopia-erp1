const fs = require('fs');
let file = fs.readFileSync('src/features/finance/components/Reports/ReconciliationCenter.tsx', 'utf8');

file = file.replace(/<\/Grid><\/Grid>    <\/Box>  \);}/g, "</Grid>\n      </Grid>\n    </Box>\n  );\n}");
file = file.replace(/<\/Grid><\/Grid>\n    <\/Box>\n  \);\n\}/g, "</Grid>\n      </Grid>\n    </Box>\n  );\n}");

fs.writeFileSync('src/features/finance/components/Reports/ReconciliationCenter.tsx', file);
