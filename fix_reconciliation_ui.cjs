const fs = require('fs');

let file = fs.readFileSync('src/features/finance/components/Reports/ReconciliationCenter.tsx', 'utf8');

file = file.replace(/const diff = Math\.abs\(totalDr - totalCr\);\s*const isBalanced = diff < 0\.01;/,
  `const diff = Math.abs(totalDr - totalCr);
  const isBalanced = diff < 0.01;
  const custRecon = useMemo(() => FinancialReportingService.getCustomerReconciliation({}), []);
  const vendRecon = useMemo(() => FinancialReportingService.getVendorReconciliation({}), []);
  const gstRecon = useMemo(() => FinancialReportingService.getGstReconciliation({}), []);`);

const newCards = `
        <Grid size={{ xs: 12, md: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Customer Reconciliation</Typography>
              {custRecon.map(r => (
                 <Box key={r.affectedCustomer} sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', p: 1.5, borderRadius: 1, mb: 1 }}>
                   <Typography>{r.customerName}</Typography>
                   <Typography>Ledger: {r.accountingBalance} | Outstanding: {r.outstandingBalance}</Typography>
                   {r.status === 'Matched' ? <Chip label="Matched" color="success" size="small" /> : <Chip label="Mismatch" color="error" size="small" />}
                 </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Vendor Reconciliation</Typography>
              {vendRecon.map(r => (
                 <Box key={r.affectedVendor} sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', p: 1.5, borderRadius: 1, mb: 1 }}>
                   <Typography>{r.vendorName}</Typography>
                   <Typography>Ledger: {r.accountingBalance} | Outstanding: {r.outstandingBalance}</Typography>
                   {r.status === 'Matched' ? <Chip label="Matched" color="success" size="small" /> : <Chip label="Mismatch" color="error" size="small" />}
                 </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>GST Reconciliation</Typography>
              {gstRecon.map(r => (
                 <Box key={r.taxLedger} sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', p: 1.5, borderRadius: 1, mb: 1 }}>
                   <Typography>{r.taxLedger}</Typography>
                   <Typography>Accounting: {r.accountingAmount} | GST Report: {r.gstReportAmount}</Typography>
                   {r.difference < 0.01 ? <Chip label="Matched" color="success" size="small" /> : <Chip label="Mismatch" color="error" size="small" />}
                 </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
`;

file = file.replace(/<\/Grid>\s*<\/Box>/, "</Grid>" + newCards + "</Grid>\n    </Box>");

fs.writeFileSync('src/features/finance/components/Reports/ReconciliationCenter.tsx', file);
