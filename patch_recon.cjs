const fs = require('fs');
let file = fs.readFileSync('src/features/finance/components/Reports/ReconciliationCenter.tsx', 'utf8');

file = file.replace(/const tb = useMemo.*?FinancialReportingService.getTrialBalance.*?;/g, 
`const tb = useMemo(() => FinancialReportingService.getTrialBalance({}), []);
  const bs = useMemo(() => FinancialReportingService.getBalanceSheet({}), []);
  
  const bsAssets = bs.totalAssets;
  const bsLiabilities = bs.totalLiabilities + bs.totalEquity + bs.netProfit;
  const isBsBalanced = Math.abs(bsAssets - bsLiabilities) < 0.01;
`);

file = file.replace(/<\/Grid>(\s*)<\/Grid>/g, 
`</Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Balance Sheet Check</Typography>
                {isBsBalanced ? (
                  <Chip icon={<CheckCircleIcon />} label="Matched" color="success" size="small" />
                ) : (
                  <Chip icon={<WarningIcon />} label="Mismatch" color="error" size="small" />
                )}
              </Box>
              <Typography color="textSecondary" sx={{ mb: 2 }}>
                Ensures that Total Assets equal Total Liabilities + Equity + Net Profit.
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', p: 1.5, borderRadius: 1, mb: 1 }}>
                <Typography>Total Assets</Typography>
                <Typography sx={{ fontWeight: 'bold' }}>{bsAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', p: 1.5, borderRadius: 1, mb: 1 }}>
                <Typography>Liabilities + Equity</Typography>
                <Typography sx={{ fontWeight: 'bold' }}>{bsLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>`);

fs.writeFileSync('src/features/finance/components/Reports/ReconciliationCenter.tsx', file);
