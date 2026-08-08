const fs = require('fs');
let file = fs.readFileSync('src/features/finance/components/Reports/ReconciliationCenter.tsx', 'utf8');

// The JSX was messed up
file = file.replace(/<Box key=\{r\.affectedCustomer\} sx=\{\{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey\.50', p: 1\.5, borderRadius: 1, mb: 1 \}\}>\s*<Typography>\{r\.customerName\}<\/Typography>\s*<Typography>Ledger: \{r\.accountingBalance\} \| Outstanding: \{r\.outstandingBalance\}<\/Typography>\s*\{r\.status === 'Matched' \? <Chip label="Matched" color="success" size="small" \/> : <Chip label="Mismatch" color="error" size="small" \/>\}\s*<\/Box>/g, 
  `<Box key={r.affectedCustomer} sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', p: 1.5, borderRadius: 1, mb: 1 }}>
     <Typography>{r.customerName}</Typography>
     <Typography>Ledger: {r.accountingBalance} | Outstanding: {r.outstandingBalance}</Typography>
     {r.status === 'Matched' ? <Chip label="Matched" color="success" size="small" /> : <Chip label="Mismatch" color="error" size="small" />}
   </Box>`);

fs.writeFileSync('src/features/finance/components/Reports/ReconciliationCenter.tsx', file);
