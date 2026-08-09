import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToWordsIndian } from '../utils/numberToWords';
import { PdfAuditService } from '../services/PdfAuditService';
import { CompanySettingsService } from '../services/CompanySettingsService';

export class DocumentPdfService {
  static loadLogo(): Promise<string | null> {
    return new Promise((resolve) => {
      resolve(null);
    });
  }

  static getBranding(doc: any, providedDetails?: any) {
    if (providedDetails && providedDetails.name) {
      return providedDetails;
    }
    return CompanySettingsService.getCompanyBrandingForDocument(doc);
  }

  static drawHeader(doc: jsPDF, companyDetails: any, documentType: string, rightAlignDetails: string[]) {
    // Top border
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(1.5);
    doc.line(14, 10, 196, 10);
    
    // Reset styling
    doc.setTextColor(50, 50, 50);

    // Company Name
    const compName = companyDetails.name || companyDetails.legalName || 'Company';
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(compName, 14, 22);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    let leftY = 28;
    const address = companyDetails.address || companyDetails.registeredAddress;
    if (address) {
      const addressLines = doc.splitTextToSize(address, 90);
      doc.text(addressLines, 14, leftY);
      leftY += addressLines.length * 4.5;
    }
    
    if (companyDetails.gstin) {
      doc.setFont("helvetica", "bold");
      doc.text("GSTIN: ", 14, leftY);
      doc.setFont("helvetica", "normal");
      doc.text(companyDetails.gstin, 27, leftY);
      leftY += 4.5;
    }
    if (companyDetails.pan) {
      doc.setFont("helvetica", "bold");
      doc.text("PAN: ", 14, leftY);
      doc.setFont("helvetica", "normal");
      doc.text(companyDetails.pan, 23, leftY);
      leftY += 4.5;
    }
    const phone = companyDetails.phone || companyDetails.mobile;
    if (phone) {
      doc.setFont("helvetica", "bold");
      doc.text("Mobile: ", 14, leftY);
      doc.setFont("helvetica", "normal");
      doc.text(phone, 26, leftY);
      leftY += 4.5;
    }
    if (companyDetails.email) {
      doc.setFont("helvetica", "bold");
      doc.text("Email: ", 14, leftY);
      doc.setFont("helvetica", "normal");
      doc.text(companyDetails.email, 24, leftY);
      leftY += 4.5;
    }
    if (companyDetails.website) {
      doc.setFont("helvetica", "bold");
      doc.text("Website: ", 14, leftY);
      doc.setFont("helvetica", "normal");
      doc.text(companyDetails.website, 28, leftY);
      leftY += 4.5;
    }

    // Right Side Document Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text(documentType, 196, 22, { align: 'right' });

    // Right Side Details
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    let rightY = 32;
    rightAlignDetails.forEach((detail) => {
      const parts = detail.split(':');
      if (parts.length > 1) {
        doc.setFont("helvetica", "bold");
        doc.text(parts[0] + ":", 140, rightY);
        doc.setFont("helvetica", "normal");
        doc.text(parts.slice(1).join(':').trim(), 196, rightY, { align: 'right' });
      } else {
        doc.setFont("helvetica", "normal");
        doc.text(detail, 196, rightY, { align: 'right' });
      }
      rightY += 5;
    });

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, Math.max(leftY, rightY) + 2, 196, Math.max(leftY, rightY) + 2);
    
    return Math.max(leftY, rightY) + 8;
  }

  static drawFooter(doc: jsPDF, companyDetails: any, finalY: number, showTerms: boolean = true) {
    const pageHeight = doc.internal.pageSize.height;
    if (finalY > pageHeight - 50) {
      doc.addPage();
      finalY = 20;
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, finalY + 5, 196, finalY + 5);

    const bankName = companyDetails.bankDetails?.bankName || companyDetails.bankName || '-';
    const accNo = companyDetails.bankDetails?.accountNumber || companyDetails.accountNumber || '-';
    const ifsc = companyDetails.bankDetails?.ifscCode || companyDetails.ifscCode || '-';
    const branch = companyDetails.bankDetails?.branchName || companyDetails.branchName || '-';

    // Bank Details
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text("Bank Details:", 14, finalY + 12);
    
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text(`Bank Name: ${bankName}`, 14, finalY + 17);
    doc.text(`Account No: ${accNo}`, 14, finalY + 22);
    doc.text(`IFSC Code: ${ifsc}`, 14, finalY + 27);
    doc.text(`Branch: ${branch}`, 14, finalY + 32);

    // Terms
    if (showTerms) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 128, 185);
      doc.text("Terms & Conditions:", 80, finalY + 12);
      
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      const terms = companyDetails.quotationTerms || "1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.\n3. E.&O.E.";
      const tcLines = doc.splitTextToSize(terms, 65);
      doc.text(tcLines, 80, finalY + 17);
    }

    // Auth Signatory
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    const compName = companyDetails.name || companyDetails.legalName || 'Company';
    doc.text(`For ${compName}`, 196, finalY + 12, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const sigName = companyDetails.authorizedSignatory || 'Authorized Signatory';
    doc.text(sigName, 196, finalY + 28, { align: 'right' });
    doc.text("Authorized Signatory", 196, finalY + 32, { align: 'right' });
  }

  static drawCustomerSection(doc: jsPDF, title: string, name: string, address: string, gstin: string, startY: number): number {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text(title, 14, startY);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text(name || '-', 14, startY + 6);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    let currentY = startY + 11;
    if (address) {
      const addrLines = doc.splitTextToSize(address, 85);
      doc.text(addrLines, 14, currentY);
      currentY += addrLines.length * 4.5;
    }
    
    if (gstin) {
      doc.setFont("helvetica", "bold");
      doc.text("GSTIN: ", 14, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(gstin, 27, currentY);
      currentY += 4.5;
    }
    
    return currentY + 5;
  }

  static addWatermark(doc: jsPDF, text: string) {
    const pages = doc.internal.pages.length;
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setTextColor(240, 240, 240);
      doc.setFontSize(80);
      doc.setFont("helvetica", "bold");
      doc.text(text, doc.internal.pageSize.width / 2, doc.internal.pageSize.height / 2, {
        align: 'center',
        angle: 45
      });
      doc.setTextColor(0, 0, 0);
    }
  }

  static async generateQuotationPdf(quotation: any, companyDetails?: any) {
    const doc = new jsPDF();
    const branding = this.getBranding(quotation, companyDetails);
    
    // Add Watermark first so it's behind text
    this.addWatermark(doc, "QUOTATION");

    const rightDetails = [
      `Quotation No: ${quotation.quotationNumber}`,
      `Date: ${new Date(quotation.date).toLocaleDateString('en-IN')}`
    ];
    if (quotation.validUntil) {
      rightDetails.push(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString('en-IN')}`);
    }

    let currentY = this.drawHeader(doc, branding, "QUOTATION", rightDetails);
    
    currentY = this.drawCustomerSection(doc, "Quoted To:", quotation.customerName, quotation.customerAddress, "", currentY);
    
    if (quotation.contactPerson) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Contact Person: ", 14, currentY - 5);
      doc.setFont("helvetica", "normal");
      doc.text(quotation.contactPerson, 40, currentY - 5);
    }

    const tableData: any[] = [];
    quotation.items.forEach((item: any, index: number) => {
      if (item.options && item.options.length > 0) {
         item.options.forEach((opt: any) => {
            const spec = `${opt.quantity} ${opt.paperType ? '- ' + opt.paperType : ''}`;
            tableData.push([
              index + 1,
              item.productName,
              spec,
              item.hsnSac || '-',
              opt.unitRate?.toFixed(2) || '',
              opt.quantity,
              opt.totalAmount?.toFixed(2) || ''
            ]);
         });
      } else {
         tableData.push([
            index + 1,
            item.productName,
            item.description || '-',
            item.hsnSac || '-',
            item.unitRate?.toFixed(2) || '',
            item.quantity,
            item.totalAmount?.toFixed(2) || ''
         ]);
      }
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Sl.', 'Product', 'Specification', 'HSN/SAC', 'Rate', 'Quantity', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        4: { halign: 'right' },
        5: { halign: 'center' },
        6: { halign: 'right' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 20 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    this.drawFooter(doc, branding, finalY, true);

    const fileName = `Quotation_${quotation.quotationNumber}_${quotation.customerName?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    await PdfAuditService.logAction('Quotation', quotation.quotationNumber, 'Downloaded');
    doc.save(fileName);
  }

  static async generateProformaInvoicePdf(pi: any, companyDetails?: any) {
    const doc = new jsPDF();
    const branding = this.getBranding(pi, companyDetails);
    
    const rightDetails = [
      `PI No: ${pi.piNumber}`,
      `Date: ${new Date(pi.date).toLocaleDateString('en-IN')}`
    ];
    if (pi.quotationReference) {
      rightDetails.push(`Ref: ${pi.quotationReference}`);
    }

    let currentY = this.drawHeader(doc, branding, "PROFORMA INVOICE", rightDetails);
    
    currentY = this.drawCustomerSection(doc, "Billed To:", pi.customerName, pi.billingAddress, pi.customerGstin, currentY);

    const tableData: any[] = [];
    pi.items?.forEach((item: any, index: number) => {
      tableData.push([
        index + 1,
        item.description || item.productName,
        item.hsnSac || '-',
        item.quantity,
        item.rate?.toFixed(2) || '',
        item.taxableValue?.toFixed(2) || '',
        `${item.gstRate || 0}%`,
        item.lineTotal?.toFixed(2) || ''
      ]);
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Sl.', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Taxable', 'GST%', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'center' },
        7: { halign: 'right' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 20 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // Financial Summary
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Amount in Words:", 14, finalY);
    doc.setFont("helvetica", "normal");
    doc.text(numberToWordsIndian(pi.grandTotal || 0), 14, finalY + 5);

    let summaryY = finalY;
    const drawSummaryLine = (label: string, value: number, isBold: boolean = false) => {
      if (isBold) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
      }
      doc.text(label, 140, summaryY);
      doc.text(value.toFixed(2), 196, summaryY, { align: 'right' });
      summaryY += 6;
    };

    drawSummaryLine("Sub Total:", pi.taxableValue || 0);
    if ((pi.discount || 0) > 0) drawSummaryLine("Discount:", pi.discount || 0);
    
    if ((pi.igst || 0) > 0) {
      drawSummaryLine("IGST:", pi.igst || 0);
    } else {
      if ((pi.cgst || 0) > 0) drawSummaryLine("CGST:", pi.cgst || 0);
      if ((pi.sgst || 0) > 0) drawSummaryLine("SGST:", pi.sgst || 0);
    }
    
    if ((pi.roundOff || 0) !== 0) drawSummaryLine("Round Off:", pi.roundOff || 0);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(140, summaryY - 3, 196, summaryY - 3);
    
    drawSummaryLine("Grand Total (Rs.):", pi.grandTotal || 0, true);

    finalY = Math.max(finalY + 15, summaryY) + 5;
    this.drawFooter(doc, branding, finalY, true);

    const fileName = `ProformaInvoice_${pi.piNumber}_${pi.customerName?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    await PdfAuditService.logAction('Proforma Invoice', pi.piNumber, 'Downloaded');
    doc.save(fileName);
  }

  static async generateGstInvoicePdf(invoice: any, companyDetails?: any) {
    const doc = new jsPDF();
    const branding = this.getBranding(invoice, companyDetails);
    
    if (invoice.status === 'Cancelled') {
      this.addWatermark(doc, "CANCELLED");
    } else if (invoice.status === 'Draft') {
      this.addWatermark(doc, "DRAFT");
    }

    const rightDetails = [
      `Invoice No: ${invoice.invoiceNumber}`,
      `Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`
    ];
    if (invoice.dueDate) {
      rightDetails.push(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`);
    }
    if (invoice.placeOfSupply) {
      rightDetails.push(`Place of Supply: ${invoice.placeOfSupply}`);
    }

    let currentY = this.drawHeader(doc, branding, "TAX INVOICE", rightDetails);
    
    const isInterState = (invoice.igst || 0) > 0;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text("Billed To:", 14, currentY);
    if (invoice.shippingAddress) {
      doc.text("Shipped To:", 105, currentY);
    }
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text(invoice.customerName || '-', 14, currentY + 6);
    if (invoice.shippingAddress) {
      doc.text(invoice.customerName || '-', 105, currentY + 6);
    }
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    let leftAddrY = currentY + 11;
    if (invoice.billingAddress) {
      const addrLines = doc.splitTextToSize(invoice.billingAddress, 85);
      doc.text(addrLines, 14, leftAddrY);
      leftAddrY += addrLines.length * 4.5;
    }
    if (invoice.customerGstin) {
      doc.setFont("helvetica", "bold");
      doc.text("GSTIN: ", 14, leftAddrY);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.customerGstin, 27, leftAddrY);
      leftAddrY += 4.5;
    }

    let rightAddrY = currentY + 11;
    if (invoice.shippingAddress) {
      const shipLines = doc.splitTextToSize(invoice.shippingAddress, 85);
      doc.text(shipLines, 105, rightAddrY);
      rightAddrY += shipLines.length * 4.5;
    }
    
    currentY = Math.max(leftAddrY, rightAddrY) + 5;

    const tableData: any[] = [];
    invoice.items?.forEach((item: any, index: number) => {
      let row = [
        index + 1,
        item.description,
        item.hsnSac || '-',
        item.quantity,
        item.rate?.toFixed(2) || '',
        item.taxableValue?.toFixed(2) || ''
      ];
      
      if (isInterState) {
        row.push(`${item.igstAmount?.toFixed(2) || '0.00'} (${item.gstRate}%)`);
      } else {
        row.push(`${item.cgstAmount?.toFixed(2) || '0.00'} (${item.gstRate/2}%)`);
        row.push(`${item.sgstAmount?.toFixed(2) || '0.00'} (${item.gstRate/2}%)`);
      }
      row.push(item.lineTotal?.toFixed(2) || '');
      tableData.push(row);
    });

    let head = [['Sl.', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Taxable']];
    if (isInterState) {
       head[0].push('IGST');
    } else {
       head[0].push('CGST', 'SGST');
    }
    head[0].push('Total');

    autoTable(doc, {
      startY: currentY,
      head,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 8 },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        [head[0].length - 1]: { halign: 'right' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 20 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // Financial Summary
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Amount in Words:", 14, finalY);
    doc.setFont("helvetica", "normal");
    doc.text(numberToWordsIndian(invoice.grandTotal || 0), 14, finalY + 5);

    let summaryY = finalY;
    const drawSummaryLine = (label: string, value: number, isBold: boolean = false) => {
      if (isBold) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
      }
      doc.text(label, 140, summaryY);
      doc.text(value.toFixed(2), 196, summaryY, { align: 'right' });
      summaryY += 6;
    };

    drawSummaryLine("Taxable Value:", invoice.taxableValue || 0);
    
    if (isInterState) {
      drawSummaryLine("IGST:", invoice.igst || 0);
    } else {
      drawSummaryLine("CGST:", invoice.cgst || 0);
      drawSummaryLine("SGST:", invoice.sgst || 0);
    }
    if ((invoice.cess || 0) > 0) drawSummaryLine("CESS:", invoice.cess || 0);
    if ((invoice.roundOff || 0) !== 0) drawSummaryLine("Round Off:", invoice.roundOff || 0);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(140, summaryY - 3, 196, summaryY - 3);
    
    drawSummaryLine("Grand Total (Rs.):", invoice.grandTotal || 0, true);

    finalY = Math.max(finalY + 15, summaryY) + 5;
    
    // Custom Footer for GST Invoice
    this.drawFooter(doc, branding, finalY, false);

    const fileName = `Invoice_${invoice.invoiceNumber}_${invoice.customerName?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    await PdfAuditService.logAction('GST Invoice', invoice.invoiceNumber, 'Downloaded');
    doc.save(fileName);
  }

  static async generateDeliveryChallanPdf(challan: any, companyDetails?: any) {
    const doc = new jsPDF();
    const branding = this.getBranding(challan, companyDetails);

    const rightDetails = [
      `Challan No: ${challan.challanNumber || challan.dcNumber}`,
      `Date: ${new Date(challan.issueDate || challan.date || Date.now()).toLocaleDateString('en-IN')}`
    ];
    if (challan.jobCardNumber) {
      rightDetails.push(`Job Card: ${challan.jobCardNumber}`);
    }
    if (challan.vehicleNumber) {
      rightDetails.push(`Vehicle No: ${challan.vehicleNumber}`);
    }

    let currentY = this.drawHeader(doc, branding, "DELIVERY CHALLAN", rightDetails);
    currentY = this.drawCustomerSection(doc, "Delivered To:", challan.customerName, challan.deliveryAddress || challan.customerAddress || '', challan.customerGstin || '', currentY);

    const tableData: any[] = [];
    (challan.items || []).forEach((item: any, index: number) => {
      tableData.push([
        index + 1,
        item.productName || item.description || '-',
        item.specification || item.paperType || '-',
        item.dispatchQty || item.quantity || 0,
        item.unit || 'Pcs'
      ]);
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Sl.', 'Item / Product', 'Specification', 'Quantity', 'Unit']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        3: { halign: 'center' },
        4: { halign: 'center' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 20 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;
    this.drawFooter(doc, branding, finalY, false);

    const fileName = `DeliveryChallan_${challan.challanNumber || challan.dcNumber}.pdf`;
    await PdfAuditService.logAction('Delivery Challan', challan.challanNumber || challan.dcNumber, 'Downloaded');
    doc.save(fileName);
  }

  static async generatePaymentReceiptPdf(receipt: any, companyDetails?: any) {
    const doc = new jsPDF();
    const branding = this.getBranding(receipt, companyDetails);

    const rightDetails = [
      `Receipt No: ${receipt.receiptNumber}`,
      `Date: ${new Date(receipt.paymentDate || receipt.date || Date.now()).toLocaleDateString('en-IN')}`
    ];
    if (receipt.paymentMode) {
      rightDetails.push(`Mode: ${receipt.paymentMode}`);
    }
    if (receipt.transactionRef) {
      rightDetails.push(`Ref: ${receipt.transactionRef}`);
    }

    let currentY = this.drawHeader(doc, branding, "PAYMENT RECEIPT", rightDetails);
    currentY = this.drawCustomerSection(doc, "Received From:", receipt.customerName, receipt.customerAddress || '', '', currentY);

    const tableData: any[] = [[
      1,
      receipt.invoiceNumber ? `Payment against Invoice #${receipt.invoiceNumber}` : (receipt.notes || 'Payment Received'),
      receipt.paymentMode || 'Online/Bank',
      receipt.transactionRef || '-',
      (receipt.amount || 0).toFixed(2)
    ]];

    autoTable(doc, {
      startY: currentY,
      head: [['Sl.', 'Description', 'Payment Mode', 'Reference No', 'Amount (Rs.)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 10 },
        4: { halign: 'right' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 20 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Amount in Words:", 14, finalY);
    doc.setFont("helvetica", "normal");
    doc.text(numberToWordsIndian(receipt.amount || 0), 14, finalY + 5);

    finalY += 15;
    this.drawFooter(doc, branding, finalY, false);

    const fileName = `PaymentReceipt_${receipt.receiptNumber}.pdf`;
    await PdfAuditService.logAction('Payment Receipt', receipt.receiptNumber, 'Downloaded');
    doc.save(fileName);
  }

  static async generateJobCardPdf(jobCard: any, companyDetails?: any) {
    const doc = new jsPDF();
    const branding = this.getBranding(jobCard, companyDetails);

    const rightDetails = [
      `Job Card No: ${jobCard.jobCardNumber}`,
      `Date: ${new Date(jobCard.createdAt || Date.now()).toLocaleDateString('en-IN')}`
    ];
    if (jobCard.deliveryDate) {
      rightDetails.push(`Target Delivery: ${new Date(jobCard.deliveryDate).toLocaleDateString('en-IN')}`);
    }

    let currentY = this.drawHeader(doc, branding, "JOB CARD", rightDetails);
    currentY = this.drawCustomerSection(doc, "Customer Details:", jobCard.customerName, '', '', currentY);

    const tableData: any[] = [];
    (jobCard.items || []).forEach((item: any, index: number) => {
      tableData.push([
        index + 1,
        item.productName || item.jobTitle || '-',
        `${item.quantity || 0} ${item.unit || 'Pcs'}`,
        item.paperSpecification || item.specification || '-',
        item.printingDetails || item.processDetails || '-'
      ]);
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Sl.', 'Job Title / Product', 'Quantity', 'Paper Spec', 'Process Details']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { halign: 'center' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 20 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;
    this.drawFooter(doc, branding, finalY, false);

    const fileName = `JobCard_${jobCard.jobCardNumber}.pdf`;
    await PdfAuditService.logAction('Job Card', jobCard.jobCardNumber, 'Downloaded');
    doc.save(fileName);
  }
}
