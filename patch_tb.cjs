const fs = require('fs');
let file = fs.readFileSync('src/features/finance/components/Reports/TrialBalanceReport.tsx', 'utf8');

file = file.replace(/import { FinancialReportingService, ReportFilters } from '\.\.\/\.\.\/services\/FinancialReportingService';/,
`import { FinancialReportingService, ReportFilters } from '../../services/FinancialReportingService';
import { ExportUtils } from '../../../gst-management/utils/exportUtils';
import DownloadIcon from '@mui/icons-material/Download';`);

file = file.replace(/const formatMoney =.*?;\n/g, function(m) {
  return m + `
  const handleExportCsv = () => {
    const headers = ['Account', 'Code', 'Group', 'Nature', 'Opening Dr', 'Opening Cr', 'Period Dr', 'Period Cr', 'Closing Dr', 'Closing Cr'];
    const rows = data.map(r => [
      r.ledgerName, r.ledgerCode, r.accountGroup, r.nature,
      r.openingDr, r.openingCr, r.periodDr, r.periodCr, r.closingDr, r.closingCr
    ]);
    rows.push(['Total', '', '', '', totalOpeningDr, totalOpeningCr, totalPeriodDr, totalPeriodCr, totalClosingDr, totalClosingCr]);
    ExportUtils.exportToCsv('Trial_Balance.csv', [headers, ...rows]);
  };
`;
});

file = file.replace(/<FormControlLabel/, `
<Button startIcon={<DownloadIcon />} variant="outlined" size="small" onClick={handleExportCsv} sx={{ mr: 2 }}>
  Export CSV
</Button>
<FormControlLabel`);


fs.writeFileSync('src/features/finance/components/Reports/TrialBalanceReport.tsx', file);
