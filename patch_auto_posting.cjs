const fs = require('fs');
let file = fs.readFileSync('src/features/finance/services/AutoPostingEngine.ts', 'utf8');

const regexReq = /baseAmount: number;\s+taxAmount\?: number;/;
const replacementReq = `baseAmount?: number;
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  cessAmount?: number;
  roundOffAmount?: number;`;

file = file.replace(regexReq, replacementReq);

const linesLogicRegex = /\/\/ Generate Lines[\s\S]*?(?=\/\/ Format voucher type)/;

const newLinesLogic = `// Generate Lines
    if (req.eventName === 'GST Invoice') {
      const grandTotal = Math.round(Math.abs((req.taxableAmount || 0) + (req.cgstAmount || 0) + (req.sgstAmount || 0) + (req.igstAmount || 0) + (req.cessAmount || 0) + (req.roundOffAmount || 0)) * 100);
      const taxable = Math.round(Math.abs(req.taxableAmount || req.baseAmount || 0) * 100);
      const cgst = Math.round(Math.abs(req.cgstAmount || 0) * 100);
      const sgst = Math.round(Math.abs(req.sgstAmount || 0) * 100);
      const igst = Math.round(Math.abs(req.igstAmount || 0) * 100);
      const cess = Math.round(Math.abs(req.cessAmount || 0) * 100);
      const roundOff = Math.round((req.roundOffAmount || 0) * 100); // Can be negative or positive

      lines.push({ id: getLineId(), ledgerCode: debitCode, debitAmount: grandTotal, creditAmount: 0 }); // Customer Dr
      lines.push({ id: getLineId(), ledgerCode: creditCode, debitAmount: 0, creditAmount: taxable }); // Sales Cr
      
      if (cgst > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-OCGST', debitAmount: 0, creditAmount: cgst });
      if (sgst > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-OSGST', debitAmount: 0, creditAmount: sgst });
      if (igst > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-OIGST', debitAmount: 0, creditAmount: igst });
      if (cess > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-OCESS', debitAmount: 0, creditAmount: cess }); // Optional if exists
      if (roundOff !== 0) {
         if (roundOff > 0) {
            lines.push({ id: getLineId(), ledgerCode: 'INC-SLS-OTH', debitAmount: 0, creditAmount: roundOff }); // Income Cr
         } else {
            lines.push({ id: getLineId(), ledgerCode: 'EXP-IND-MSC', debitAmount: Math.abs(roundOff), creditAmount: 0 }); // Exp Dr
         }
      }
    } else if (req.eventName === 'Purchase Invoice') {
      const grandTotal = Math.round(Math.abs((req.taxableAmount || 0) + (req.cgstAmount || 0) + (req.sgstAmount || 0) + (req.igstAmount || 0) + (req.cessAmount || 0) + (req.roundOffAmount || 0)) * 100);
      const taxable = Math.round(Math.abs(req.taxableAmount || req.baseAmount || 0) * 100);
      const cgst = Math.round(Math.abs(req.cgstAmount || 0) * 100);
      const sgst = Math.round(Math.abs(req.sgstAmount || 0) * 100);
      const igst = Math.round(Math.abs(req.igstAmount || 0) * 100);
      const cess = Math.round(Math.abs(req.cessAmount || 0) * 100);
      const roundOff = Math.round((req.roundOffAmount || 0) * 100);

      lines.push({ id: getLineId(), ledgerCode: debitCode, debitAmount: taxable, creditAmount: 0 }); // Purchase Dr
      
      if (cgst > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-ICGST', debitAmount: cgst, creditAmount: 0 });
      if (sgst > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-ISGST', debitAmount: sgst, creditAmount: 0 });
      if (igst > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-IIGST', debitAmount: igst, creditAmount: 0 });
      if (cess > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-ICESS', debitAmount: cess, creditAmount: 0 });
      if (roundOff !== 0) {
         if (roundOff > 0) {
            lines.push({ id: getLineId(), ledgerCode: 'EXP-IND-MSC', debitAmount: roundOff, creditAmount: 0 }); // Exp Dr
         } else {
            lines.push({ id: getLineId(), ledgerCode: 'INC-SLS-OTH', debitAmount: 0, creditAmount: Math.abs(roundOff) }); // Income Cr
         }
      }

      lines.push({ id: getLineId(), ledgerCode: creditCode, debitAmount: 0, creditAmount: grandTotal }); // Vendor Cr
    } else {
      const basePaise = Math.round(Math.abs(req.baseAmount || 0) * 100);
      lines.push({ id: getLineId(), ledgerCode: debitCode, debitAmount: basePaise, creditAmount: 0 });
      lines.push({ id: getLineId(), ledgerCode: creditCode, debitAmount: 0, creditAmount: basePaise });
    }
    
    `;

file = file.replace(linesLogicRegex, newLinesLogic);

fs.writeFileSync('src/features/finance/services/AutoPostingEngine.ts', file);
