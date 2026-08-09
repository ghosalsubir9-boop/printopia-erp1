import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToWordsIndian } from '../utils/numberToWords';
import { PdfAuditService } from '../services/PdfAuditService';
import { CompanySettingsService } from '../services/CompanySettingsService';

export type DocumentType =
  | 'Quotation'
  | 'Proforma Invoice'
  | 'GST Invoice'
  | 'Job Card'
  | 'Delivery Challan'
  | 'Payment Receipt'
  | 'Purchase Order'
  | 'GRN';

export class DocumentPdfService {
  /**
   * Helper to load company logo image into base64 data URI safely
   */
  static async loadLogoImage(logoUrl?: string): Promise<{ data: string; format: 'PNG' | 'JPEG'; width: number; height: number } | null> {
    if (!logoUrl || logoUrl.includes('via.placeholder.com') || logoUrl.includes('placeholder')) {
      return null;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 1500); // 1.5s timeout safety

      if (logoUrl.startsWith('data:image/')) {
        const img = new Image();
        img.onload = () => {
          clearTimeout(timeout);
          const format = logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
          resolve({ data: logoUrl, format, width: img.width || 100, height: img.height || 100 });
        };
        img.onerror = () => {
          clearTimeout(timeout);
          resolve(null);
        };
        img.src = logoUrl;
        return;
      }

      // HTTP/HTTPS URL
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 100;
          canvas.height = img.height || 100;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            clearTimeout(timeout);
            resolve({ data: dataUrl, format: 'PNG', width: img.width || 100, height: img.height || 100 });
            return;
          }
        } catch {
          // CORS fallback
        }
        clearTimeout(timeout);
        resolve(null);
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };
      img.src = logoUrl;
    });
  }

  static getBranding(doc: any, providedDetails?: any) {
    if (providedDetails && (providedDetails.name || providedDetails.legalName)) {
      return providedDetails;
    }
    return CompanySettingsService.getCompanyBrandingForDocument(doc);
  }

  static sanitizeFilename(title: string, number: string, customerName?: string): string {
    const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '-');
    const cleanNum = (number || 'DOC').replace(/[^a-zA-Z0-9\-]/g, '-');
    const cleanCust = customerName ? `-${customerName.replace(/[^a-zA-Z0-9]/g, '-')}` : '';
    return `${cleanTitle}-${cleanNum}${cleanCust}.pdf`;
  }

  /**
   * Draw standard company header with dynamic branding and logo support
   */
  static drawHeader(
    doc: jsPDF,
    companyDetails: any,
    documentType: string,
    rightAlignDetails: string[],
    logoImg?: { data: string; format: 'PNG' | 'JPEG'; width: number; height: number } | null
  ): number {
    // Top primary border line
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(1.5);
    doc.line(14, 10, 196, 10);

    let leftY = 18;

    // Draw Logo if present
    if (logoImg) {
      try {
        const maxW = 40;
        const maxH = 16;
        const ratio = Math.min(maxW / logoImg.width, maxH / logoImg.height, 1);
        const finalW = logoImg.width * ratio;
        const finalH = logoImg.height * ratio;
        doc.addImage(logoImg.data, logoImg.format, 14, leftY, finalW, finalH);
        leftY += finalH + 4;
      } catch {
        // Fallback to text
      }
    }

    // Company Name
    const compName = companyDetails.name || companyDetails.legalName || 'PRINTOPIA GRAPHICS PVT. LTD.';
    doc.setTextColor(41, 128, 185);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(compName, 14, leftY);
    leftY += 5;

    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');

    const address = companyDetails.address || companyDetails.registeredAddress;
    if (address) {
      const addressLines = doc.splitTextToSize(address, 95);
      doc.text(addressLines, 14, leftY);
      leftY += addressLines.length * 4;
    }

    if (companyDetails.gstin) {
      doc.setFont('helvetica', 'bold');
      doc.text('GSTIN: ', 14, leftY);
      doc.setFont('helvetica', 'normal');
      doc.text(companyDetails.gstin, 28, leftY);
      leftY += 4;
    }

    if (companyDetails.pan) {
      doc.setFont('helvetica', 'bold');
      doc.text('PAN: ', 14, leftY);
      doc.setFont('helvetica', 'normal');
      doc.text(companyDetails.pan, 24, leftY);
      leftY += 4;
    }

    const phone = companyDetails.phone || companyDetails.mobile;
    if (phone) {
      doc.setFont('helvetica', 'bold');
      doc.text('Phone/Mobile: ', 14, leftY);
      doc.setFont('helvetica', 'normal');
      doc.text(phone, 36, leftY);
      leftY += 4;
    }

    if (companyDetails.email) {
      doc.setFont('helvetica', 'bold');
      doc.text('Email: ', 14, leftY);
      doc.setFont('helvetica', 'normal');
      doc.text(companyDetails.email, 25, leftY);
      leftY += 4;
    }

    // Right Side Document Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text(documentType, 196, 20, { align: 'right' });

    // Right Side Details
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    let rightY = 28;
    rightAlignDetails.forEach((detail) => {
      const parts = detail.split(':');
      if (parts.length > 1) {
        doc.setFont('helvetica', 'bold');
        doc.text(parts[0] + ':', 135, rightY);
        doc.setFont('helvetica', 'normal');
        doc.text(parts.slice(1).join(':').trim(), 196, rightY, { align: 'right' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.text(detail, 196, rightY, { align: 'right' });
      }
      rightY += 4.5;
    });

    const dividerY = Math.max(leftY, rightY) + 2;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, dividerY, 196, dividerY);

    return dividerY + 6;
  }

  /**
   * Draw standard customer or vendor details block
   */
  static drawCustomerSection(
    doc: jsPDF,
    title: string,
    name: string,
    address: string,
    gstin: string,
    startY: number,
    extraFields?: { label: string; value: string }[]
  ): number {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text(title, 14, startY);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(name || '-', 14, startY + 5);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    let currentY = startY + 9.5;

    if (address) {
      const addrLines = doc.splitTextToSize(address, 90);
      doc.text(addrLines, 14, currentY);
      currentY += addrLines.length * 4;
    }

    if (gstin) {
      doc.setFont('helvetica', 'bold');
      doc.text('GSTIN: ', 14, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(gstin, 28, currentY);
      currentY += 4;
    }

    if (extraFields && extraFields.length > 0) {
      extraFields.forEach((field) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${field.label}: `, 14, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(field.value || '-', 14 + doc.getTextWidth(`${field.label}: `), currentY);
        currentY += 4;
      });
    }

    return currentY + 3;
  }

  /**
   * Draw document footer with Bank Details, Terms & Signatory
   */
  static drawFooter(doc: jsPDF, companyDetails: any, finalY: number, showTerms: boolean = true) {
    const pageHeight = doc.internal.pageSize.height;
    if (finalY > pageHeight - 45) {
      doc.addPage();
      finalY = 20;
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, finalY + 4, 196, finalY + 4);

    const bankName = companyDetails.bankDetails?.bankName || companyDetails.bankName || '-';
    const accNo = companyDetails.bankDetails?.accountNumber || companyDetails.accountNumber || '-';
    const ifsc = companyDetails.bankDetails?.ifscCode || companyDetails.ifscCode || '-';
    const branch = companyDetails.bankDetails?.branchName || companyDetails.branchName || '-';

    // Bank Details
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('Bank Payment Details:', 14, finalY + 10);

    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bank Name: ${bankName}`, 14, finalY + 14.5);
    doc.text(`Account No: ${accNo}`, 14, finalY + 18.5);
    doc.text(`IFSC Code: ${ifsc}`, 14, finalY + 22.5);
    if (branch && branch !== '-') {
      doc.text(`Branch: ${branch}`, 14, finalY + 26.5);
    }

    // Terms
    if (showTerms) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(41, 128, 185);
      doc.text('Terms & Conditions:', 85, finalY + 10);

      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      const terms =
        companyDetails.quotationTerms ||
        '1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.\n3. E.&O.E.';
      const tcLines = doc.splitTextToSize(terms, 60);
      doc.text(tcLines, 85, finalY + 14.5);
    }

    // Auth Signatory
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    const compName = companyDetails.name || companyDetails.legalName || 'Printopia Graphics Pvt. Ltd.';
    doc.text(`For ${compName}`, 196, finalY + 10, { align: 'right' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const sigName = companyDetails.authorizedSignatory || 'Authorized Signatory';
    doc.text(sigName, 196, finalY + 26, { align: 'right' });
    doc.text('Authorized Signatory', 196, finalY + 30, { align: 'right' });
  }

  /**
   * Apply watermark to PDF
   */
  static addWatermark(doc: jsPDF, text: string) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setTextColor(235, 235, 235);
      doc.setFontSize(70);
      doc.setFont('helvetica', 'bold');
      doc.text(text, doc.internal.pageSize.width / 2, doc.internal.pageSize.height / 2, {
        align: 'center',
        angle: 45
      });
      doc.setTextColor(0, 0, 0);
    }
  }

  /**
   * Multi-page numbering pass ("Page X of Y")
   */
  static applyPageNumbers(doc: jsPDF) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(`Page ${i} of ${totalPages}`, 196, 290, { align: 'right' });
      doc.text('Printopia ERP Document System', 14, 290);
    }
  }

  // ==========================================
  // 1. QUOTATION PDF
  // ==========================================
  static async generateQuotationPdf(quotation: any, companyDetails?: any): Promise<jsPDF> {
    const doc = new jsPDF();
    const branding = this.getBranding(quotation, companyDetails);
    const logoImg = await this.loadLogoImage(branding.logo);

    this.addWatermark(doc, 'QUOTATION');

    const rightDetails = [
      `Quotation No: ${quotation.quotationNumber || 'QT-DRAFT'}`,
      `Date: ${quotation.date ? new Date(quotation.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`
    ];
    if (quotation.validUntil) {
      rightDetails.push(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString('en-IN')}`);
    }
    if (quotation.salesExecutive) {
      rightDetails.push(`Sales Exec: ${quotation.salesExecutive}`);
    }

    let currentY = this.drawHeader(doc, branding, 'QUOTATION', rightDetails, logoImg);

    currentY = this.drawCustomerSection(
      doc,
      'Quoted To:',
      quotation.customerName,
      quotation.billingAddress || quotation.customerAddress || '',
      quotation.gstin || '',
      currentY,
      quotation.contactPerson ? [{ label: 'Contact Person', value: quotation.contactPerson }] : []
    );

    const tableData: any[] = [];
    (quotation.items || []).forEach((item: any, index: number) => {
      if (item.options && item.options.length > 0) {
        item.options.forEach((opt: any, optIdx: number) => {
          const specParts: string[] = [];
          if (opt.paperType) specParts.push(`Paper: ${opt.paperType} ${opt.gsm ? opt.gsm + ' GSM' : ''}`);
          if (opt.colors) specParts.push(`Colors: ${opt.colors}`);
          if (opt.printingSide) specParts.push(`Side: ${opt.printingSide}`);
          if (opt.fileAccessories && opt.fileAccessories !== 'None') specParts.push(`Accessory: ${opt.fileAccessories}`);

          tableData.push([
            optIdx === 0 ? index + 1 : '',
            optIdx === 0 ? item.productName : `(Option ${optIdx + 1})`,
            specParts.length > 0 ? specParts.join(' | ') : (item.productDescription || '-'),
            item.hsnSac || '-',
            Number(opt.quantity || item.quantity || 0).toLocaleString('en-IN'),
            `Rs. ${Number(opt.rate || opt.unitRate || 0).toFixed(2)}`,
            `${opt.gstRate || item.gstRate || 18}%`,
            `Rs. ${Number(opt.total || opt.totalAmount || 0).toFixed(2)}`
          ]);
        });
      } else {
        tableData.push([
          index + 1,
          item.productName || item.item || '-',
          item.productDescription || item.description || '-',
          item.hsnSac || '-',
          Number(item.quantity || 0).toLocaleString('en-IN'),
          `Rs. ${Number(item.rate || item.unitRate || 0).toFixed(2)}`,
          `${item.gstRate || 18}%`,
          `Rs. ${Number(item.total || item.totalAmount || 0).toFixed(2)}`
        ]);
      }
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Sl.', 'Product Name', 'Specification', 'HSN/SAC', 'Quantity', 'Unit Rate', 'GST %', 'Item Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        4: { halign: 'center' },
        5: { halign: 'right' },
        6: { halign: 'center' },
        7: { halign: 'right' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 20, bottom: 25 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    // IMPORTANT RULE: DO NOT SHOW GRAND TOTAL IN QUOTATION PDF.
    // We only display terms and signature area.
    this.drawFooter(doc, branding, finalY, true);
    this.applyPageNumbers(doc);

    await PdfAuditService.logAction('Quotation', quotation.quotationNumber || 'DRAFT', 'Generated');
    return doc;
  }

  // ==========================================
  // 2. PROFORMA INVOICE PDF
  // ==========================================
  static async generateProformaInvoicePdf(pi: any, companyDetails?: any): Promise<jsPDF> {
    const doc = new jsPDF();
    const branding = this.getBranding(pi, companyDetails);
    const logoImg = await this.loadLogoImage(branding.logo);

    this.addWatermark(doc, 'PROFORMA INVOICE');

    const rightDetails = [
      `PI No: ${pi.piNumber || 'PI-DRAFT'}`,
      `Date: ${pi.date ? new Date(pi.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`
    ];
    if (pi.quotationReference) {
      rightDetails.push(`Ref Quote: ${pi.quotationReference}`);
    }

    let currentY = this.drawHeader(doc, branding, 'PROFORMA INVOICE', rightDetails, logoImg);

    currentY = this.drawCustomerSection(
      doc,
      'Billed To:',
      pi.customerName,
      pi.billingAddress || pi.customerAddress || '',
      pi.customerGstin || pi.gstin || '',
      currentY
    );

    const tableData: any[] = [];
    (pi.items || []).forEach((item: any, index: number) => {
      const desc = item.productName ? `${item.productName} ${item.description ? '- ' + item.description : ''}` : item.description || '-';
      const qty = Number(item.quantity || 0);
      const rate = Number(item.rate || item.ratePerPiece || 0);
      const taxable = Number(item.taxableValue || item.taxableAmount || (qty * rate));
      const gstRate = Number(item.gstRate || 18);
      const total = Number(item.lineTotal || item.itemAmount || (taxable + (taxable * gstRate) / 100));

      tableData.push([
        index + 1,
        desc,
        item.hsnSac || '-',
        qty.toLocaleString('en-IN'),
        rate.toFixed(2),
        taxable.toFixed(2),
        `${gstRate}%`,
        total.toFixed(2)
      ]);
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Sl.', 'Description', 'HSN/SAC', 'Qty', 'Rate (Rs.)', 'Taxable (Rs.)', 'GST %', 'Total (Rs.)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'center' },
        7: { halign: 'right' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 20, bottom: 25 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 8;

    // Financial Summary
    const grandTotal = Number(pi.grandTotal || 0);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Amount in Words:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    const wordsLines = doc.splitTextToSize(numberToWordsIndian(grandTotal), 115);
    doc.text(wordsLines, 14, finalY + 4.5);

    let summaryY = finalY;
    const drawSummaryLine = (label: string, value: number, isBold: boolean = false) => {
      if (isBold) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }
      doc.text(label, 140, summaryY);
      doc.text(`Rs. ${value.toFixed(2)}`, 196, summaryY, { align: 'right' });
      summaryY += 5;
    };

    drawSummaryLine('Sub Total:', Number(pi.taxableValue || pi.subTotal || 0));
    if (Number(pi.discount || 0) > 0) drawSummaryLine('Discount:', Number(pi.discount || 0));

    if (Number(pi.igst || 0) > 0) {
      drawSummaryLine('IGST Total:', Number(pi.igst || 0));
    } else {
      if (Number(pi.cgst || 0) > 0) drawSummaryLine('CGST Total:', Number(pi.cgst || 0));
      if (Number(pi.sgst || 0) > 0) drawSummaryLine('SGST Total:', Number(pi.sgst || 0));
    }

    if (Number(pi.roundOff || 0) !== 0) drawSummaryLine('Round Off:', Number(pi.roundOff || 0));

    doc.setDrawColor(200, 200, 200);
    doc.line(140, summaryY - 2, 196, summaryY - 2);

    drawSummaryLine('Grand Total:', grandTotal, true);

    finalY = Math.max(finalY + 18, summaryY) + 4;
    this.drawFooter(doc, branding, finalY, true);
    this.applyPageNumbers(doc);

    await PdfAuditService.logAction('Proforma Invoice', pi.piNumber || 'DRAFT', 'Generated');
    return doc;
  }

  // ==========================================
  // 3. GST / TAX INVOICE PDF
  // ==========================================
  static async generateGstInvoicePdf(invoice: any, companyDetails?: any): Promise<jsPDF> {
    const doc = new jsPDF();
    const branding = this.getBranding(invoice, companyDetails);
    const logoImg = await this.loadLogoImage(branding.logo);

    if (invoice.status === 'Cancelled') {
      this.addWatermark(doc, 'CANCELLED');
    } else if (invoice.status === 'Draft') {
      this.addWatermark(doc, 'DRAFT INVOICE');
    }

    const rightDetails = [
      `Invoice No: ${invoice.invoiceNumber || 'INV-DRAFT'}`,
      `Invoice Date: ${invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`
    ];
    if (invoice.dueDate) {
      rightDetails.push(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`);
    }
    if (invoice.placeOfSupply) {
      rightDetails.push(`Place of Supply: ${invoice.placeOfSupply}`);
    }

    let currentY = this.drawHeader(doc, branding, 'TAX INVOICE', rightDetails, logoImg);

    const isInterState = Number(invoice.igst || 0) > 0;

    // Customer Billing & Shipping
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('Billed To:', 14, currentY);
    if (invoice.shippingAddress) {
      doc.text('Shipped To:', 105, currentY);
    }

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(invoice.customerName || '-', 14, currentY + 5);
    if (invoice.shippingAddress) {
      doc.text(invoice.customerName || '-', 105, currentY + 5);
    }

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    let leftAddrY = currentY + 9.5;
    if (invoice.billingAddress) {
      const addrLines = doc.splitTextToSize(invoice.billingAddress, 85);
      doc.text(addrLines, 14, leftAddrY);
      leftAddrY += addrLines.length * 4;
    }
    if (invoice.customerGstin) {
      doc.setFont('helvetica', 'bold');
      doc.text('GSTIN: ', 14, leftAddrY);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.customerGstin, 28, leftAddrY);
      leftAddrY += 4;
    }

    let rightAddrY = currentY + 9.5;
    if (invoice.shippingAddress) {
      const shipLines = doc.splitTextToSize(invoice.shippingAddress, 85);
      doc.text(shipLines, 105, rightAddrY);
      rightAddrY += shipLines.length * 4;
    }

    currentY = Math.max(leftAddrY, rightAddrY) + 5;

    const tableData: any[] = [];
    (invoice.items || []).forEach((item: any, index: number) => {
      const desc = item.productName
        ? item.description
          ? `${item.productName} - ${item.description}`
          : item.productName
        : item.description || '-';
      const qty = Number(item.quantity || 0);
      const rateVal = Number(item.ratePerPiece ?? item.rate ?? 0);
      const taxableVal = Number(item.taxableAmount ?? item.taxableValue ?? qty * rateVal);
      const cgstVal = Number(item.cgst ?? item.cgstAmount ?? 0);
      const sgstVal = Number(item.sgst ?? item.sgstAmount ?? 0);
      const igstVal = Number(item.igst ?? item.igstAmount ?? 0);
      const totalVal = Number(item.itemAmount ?? item.lineTotal ?? taxableVal + cgstVal + sgstVal + igstVal);
      const gstRate = Number(item.gstRate || 18);

      const row = [
        index + 1,
        desc,
        item.hsnSac || '-',
        qty.toLocaleString('en-IN'),
        rateVal.toFixed(2),
        taxableVal.toFixed(2)
      ];

      if (isInterState) {
        row.push(`${igstVal.toFixed(2)}\n(${gstRate}%)`);
      } else {
        row.push(`${cgstVal.toFixed(2)}\n(${gstRate / 2}%)`);
        row.push(`${sgstVal.toFixed(2)}\n(${gstRate / 2}%)`);
      }
      row.push(totalVal.toFixed(2));
      tableData.push(row);
    });

    const head = [['Sl.', 'Description', 'HSN/SAC', 'Qty', 'Rate (Rs.)', 'Taxable (Rs.)']];
    if (isInterState) {
      head[0].push('IGST (Rs.)');
    } else {
      head[0].push('CGST (Rs.)', 'SGST (Rs.)');
    }
    head[0].push('Total (Rs.)');

    autoTable(doc, {
      startY: currentY,
      head,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 8 },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        [head[0].length - 1]: { halign: 'right' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 20, bottom: 25 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 8;

    // Financial Summary
    const grandTotal = Number(invoice.grandTotal || 0);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Amount in Words:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    const wordsLines = doc.splitTextToSize(numberToWordsIndian(grandTotal), 115);
    doc.text(wordsLines, 14, finalY + 4.5);

    let summaryY = finalY;
    const drawSummaryLine = (label: string, value: number, isBold: boolean = false) => {
      if (isBold) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }
      doc.text(label, 140, summaryY);
      doc.text(`Rs. ${value.toFixed(2)}`, 196, summaryY, { align: 'right' });
      summaryY += 5;
    };

    drawSummaryLine('Taxable Amount:', Number(invoice.taxableValue || invoice.taxableAmount || 0));

    if (isInterState) {
      drawSummaryLine('IGST Total:', Number(invoice.igst || 0));
    } else {
      drawSummaryLine('CGST Total:', Number(invoice.cgst || 0));
      drawSummaryLine('SGST Total:', Number(invoice.sgst || 0));
    }

    if (Number(invoice.cess || 0) > 0) drawSummaryLine('CESS:', Number(invoice.cess || 0));
    if (Number(invoice.roundOff || 0) !== 0) drawSummaryLine('Round Off:', Number(invoice.roundOff || 0));

    doc.setDrawColor(200, 200, 200);
    doc.line(140, summaryY - 2, 196, summaryY - 2);

    drawSummaryLine('Grand Total:', grandTotal, true);

    finalY = Math.max(finalY + 18, summaryY) + 4;
    this.drawFooter(doc, branding, finalY, false);
    this.applyPageNumbers(doc);

    await PdfAuditService.logAction('GST Invoice', invoice.invoiceNumber || 'DRAFT', 'Generated');
    return doc;
  }

  // ==========================================
  // 4. JOB CARD PDF (PRODUCTION FRIENDLY)
  // ==========================================
  static async generateJobCardPdf(jobCard: any, companyDetails?: any): Promise<jsPDF> {
    const doc = new jsPDF();
    const branding = this.getBranding(jobCard, companyDetails);
    const logoImg = await this.loadLogoImage(branding.logo);

    this.addWatermark(doc, 'PRODUCTION');

    const rightDetails = [
      `Job Card No: ${jobCard.jobCardNumber || 'JC-DRAFT'}`,
      `Date: ${jobCard.createdAt ? new Date(jobCard.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`,
      `Delivery Date: ${jobCard.targetDeliveryDate || jobCard.deliveryDate ? new Date(jobCard.targetDeliveryDate || jobCard.deliveryDate).toLocaleDateString('en-IN') : '-'}`
    ];
    if (jobCard.poNumber) {
      rightDetails.push(`PO Ref: ${jobCard.poNumber}`);
    }

    let currentY = this.drawHeader(doc, branding, 'PRODUCTION JOB CARD', rightDetails, logoImg);

    currentY = this.drawCustomerSection(
      doc,
      'Customer & Job Summary:',
      jobCard.customerName || 'Internal Production',
      '',
      '',
      currentY,
      [
        { label: 'Job / Product Name', value: jobCard.jobTitle || jobCard.productName || '-' },
        { label: 'Order Quantity', value: `${Number(jobCard.quantity || 0).toLocaleString('en-IN')} ${jobCard.unit || 'Pcs'}` }
      ]
    );

    // Production Technical Grid
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('Production Specifications:', 14, currentY);
    currentY += 4;

    const specGrid: any[] = [
      [
        'Final Size', jobCard.finalSize || jobCard.size || '-',
        'Open Size', jobCard.openSize || '-'
      ],
      [
        'Paper Type', jobCard.paperType || jobCard.paperSpecification || '-',
        'Paper GSM', jobCard.gsm ? `${jobCard.gsm} GSM` : '-'
      ],
      [
        'Parent Sheet Size', jobCard.parentSheetSize || '-',
        'UPS (Units/Sheet)', jobCard.ups ? `${jobCard.ups} UPS` : '-'
      ],
      [
        'Assigned Machine', jobCard.machineName || jobCard.machine || '-',
        'No. of Colors', jobCard.colors || jobCard.numberOfColors || '-'
      ],
      [
        'Plate Details', jobCard.plateInfo || jobCard.plateDetails || 'CTP Standard',
        'Printing Side', jobCard.printingSide || 'Front & Back'
      ],
      [
        'Wastage Allowance', jobCard.wastage ? `${jobCard.wastage} sheets` : '-',
        'Created By', jobCard.createdBy || 'Production Controller'
      ]
    ];

    autoTable(doc, {
      startY: currentY,
      body: specGrid,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 2.5, lineWidth: 0.2, lineColor: [200, 200, 200] },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [240, 245, 250], cellWidth: 35 },
        1: { cellWidth: 55 },
        2: { fontStyle: 'bold', fillColor: [240, 245, 250], cellWidth: 35 },
        3: { cellWidth: 57 }
      },
      margin: { top: 20, bottom: 25 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Finishing & Post-Press Requirements
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('Finishing & Post-Press Process Details:', 14, currentY);
    currentY += 4;

    const finishingData: any[] = [];
    if (jobCard.items && jobCard.items.length > 0) {
      jobCard.items.forEach((item: any, idx: number) => {
        finishingData.push([
          idx + 1,
          item.productName || item.jobTitle || 'Process Item',
          item.quantity || jobCard.quantity,
          item.finishingDetails || item.processDetails || item.paperSpecification || '-'
        ]);
      });
    } else {
      finishingData.push([
        1,
        jobCard.jobTitle || jobCard.productName || 'Printing & Binding',
        jobCard.quantity || 0,
        jobCard.finishingDetails || jobCard.specialInstructions || 'Standard Cutting, Folding & Packing'
      ]);
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Sl.', 'Process / Component', 'Quantity', 'Instruction / Specification Details']],
      body: finishingData,
      theme: 'grid',
      headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { halign: 'center' }
      },
      margin: { top: 20, bottom: 25 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 8;

    // Production Signatures & QC Stamps
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY, 196, finalY);
    finalY += 6;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);

    doc.text('Operator Sign:', 14, finalY);
    doc.text('QC Inspector:', 75, finalY);
    doc.text('Production Manager:', 140, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('_______________________', 14, finalY + 12);
    doc.text('_______________________', 75, finalY + 12);
    doc.text('_______________________', 140, finalY + 12);

    this.applyPageNumbers(doc);
    await PdfAuditService.logAction('Job Card', jobCard.jobCardNumber || 'JC-DRAFT', 'Generated');
    return doc;
  }

  // ==========================================
  // 5. DELIVERY CHALLAN PDF
  // ==========================================
  static async generateDeliveryChallanPdf(challan: any, companyDetails?: any): Promise<jsPDF> {
    const doc = new jsPDF();
    const branding = this.getBranding(challan, companyDetails);
    const logoImg = await this.loadLogoImage(branding.logo);

    this.addWatermark(doc, 'DELIVERY CHALLAN');

    const rightDetails = [
      `Challan No: ${challan.challanNumber || challan.dcNumber || 'DC-DRAFT'}`,
      `Date: ${challan.issueDate || challan.date ? new Date(challan.issueDate || challan.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`
    ];
    if (challan.jobCardNumber) rightDetails.push(`Job Card: ${challan.jobCardNumber}`);
    if (challan.invoiceNumber) rightDetails.push(`Invoice Ref: ${challan.invoiceNumber}`);
    if (challan.vehicleNumber) rightDetails.push(`Vehicle No: ${challan.vehicleNumber}`);
    if (challan.transporterName) rightDetails.push(`Transporter: ${challan.transporterName}`);

    let currentY = this.drawHeader(doc, branding, 'DELIVERY CHALLAN', rightDetails, logoImg);

    currentY = this.drawCustomerSection(
      doc,
      'Delivered To / Shipping Address:',
      challan.customerName,
      challan.deliveryAddress || challan.shippingAddress || challan.customerAddress || '',
      challan.customerGstin || ''
    );

    const tableData: any[] = [];
    (challan.items || []).forEach((item: any, index: number) => {
      tableData.push([
        index + 1,
        item.productName || item.description || '-',
        item.specification || item.paperType || '-',
        Number(item.orderedQty || item.orderQuantity || item.dispatchQty || item.quantity || 0).toLocaleString('en-IN'),
        Number(item.dispatchQty || item.quantity || 0).toLocaleString('en-IN'),
        Number(item.pendingQty || 0).toLocaleString('en-IN'),
        item.unit || 'Pcs'
      ]);
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Sl.', 'Item / Product Name', 'Specification', 'Ordered Qty', 'Dispatched Qty', 'Pending Qty', 'Unit']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 20, bottom: 25 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 12;

    // Acknowledgement & Signatures
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY, 196, finalY);
    finalY += 6;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);

    doc.text('Dispatched By:', 14, finalY);
    doc.text('Driver / Carrier Sign:', 75, finalY);
    doc.text("Receiver's Sign & Stamp:", 140, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('_______________________', 14, finalY + 12);
    doc.text('_______________________', 75, finalY + 12);
    doc.text('_______________________', 140, finalY + 12);

    this.applyPageNumbers(doc);
    await PdfAuditService.logAction('Delivery Challan', challan.challanNumber || challan.dcNumber || 'DC-DRAFT', 'Generated');
    return doc;
  }

  // ==========================================
  // 6. PAYMENT RECEIPT PDF
  // ==========================================
  static async generatePaymentReceiptPdf(receipt: any, companyDetails?: any): Promise<jsPDF> {
    const doc = new jsPDF();
    const branding = this.getBranding(receipt, companyDetails);
    const logoImg = await this.loadLogoImage(branding.logo);

    this.addWatermark(doc, 'PAYMENT RECEIPT');

    const rightDetails = [
      `Receipt No: ${receipt.receiptNumber || 'RCP-DRAFT'}`,
      `Date: ${receipt.paymentDate || receipt.date ? new Date(receipt.paymentDate || receipt.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`
    ];
    if (receipt.paymentMode) rightDetails.push(`Mode: ${receipt.paymentMode}`);
    if (receipt.transactionRef || receipt.referenceNo) rightDetails.push(`Ref No: ${receipt.transactionRef || receipt.referenceNo}`);

    let currentY = this.drawHeader(doc, branding, 'PAYMENT RECEIPT', rightDetails, logoImg);

    currentY = this.drawCustomerSection(
      doc,
      'Received From:',
      receipt.customerName,
      receipt.customerAddress || '',
      receipt.gstin || ''
    );

    const amount = Number(receipt.amount || 0);

    const tableData: any[] = [
      [
        1,
        receipt.invoiceNumber
          ? `Payment received against Invoice #${receipt.invoiceNumber}`
          : receipt.notes || 'Payment Received towards account settlement',
        receipt.paymentMode || 'Bank / Online',
        receipt.transactionRef || receipt.referenceNo || '-',
        `Rs. ${amount.toFixed(2)}`
      ]
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Sl.', 'Description / Particulars', 'Payment Mode', 'Reference / Cheque No', 'Amount Paid']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 10 },
        4: { halign: 'right' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 20, bottom: 25 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Amount in Words:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(numberToWordsIndian(amount), 14, finalY + 5);

    if (receipt.outstandingBalance !== undefined) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Remaining Account Outstanding: Rs. ${Number(receipt.outstandingBalance).toFixed(2)}`, 14, finalY + 11);
    }

    finalY += 18;
    this.drawFooter(doc, branding, finalY, false);
    this.applyPageNumbers(doc);

    await PdfAuditService.logAction('Payment Receipt', receipt.receiptNumber || 'RCP-DRAFT', 'Generated');
    return doc;
  }

  // ==========================================
  // 7. PURCHASE ORDER PDF
  // ==========================================
  static async generatePurchaseOrderPdf(po: any, companyDetails?: any): Promise<jsPDF> {
    const doc = new jsPDF();
    const branding = this.getBranding(po, companyDetails);
    const logoImg = await this.loadLogoImage(branding.logo);

    this.addWatermark(doc, 'PURCHASE ORDER');

    const rightDetails = [
      `PO No: ${po.poNumber || 'PUR-DRAFT'}`,
      `Date: ${po.poDate ? new Date(po.poDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`
    ];
    if (po.expectedDeliveryDate) {
      rightDetails.push(`Expected Delivery: ${new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN')}`);
    }
    if (po.paymentTerms) {
      rightDetails.push(`Terms: ${po.paymentTerms}`);
    }

    let currentY = this.drawHeader(doc, branding, 'PURCHASE ORDER', rightDetails, logoImg);

    // Vendor & Delivery Addresses
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('Vendor Details:', 14, currentY);
    doc.text('Delivery Address:', 105, currentY);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(po.vendorName || '-', 14, currentY + 5);
    doc.text(branding.name || 'Company Warehouse', 105, currentY + 5);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    let leftVendorY = currentY + 9.5;
    if (po.billingAddress) {
      const vLines = doc.splitTextToSize(po.billingAddress, 85);
      doc.text(vLines, 14, leftVendorY);
      leftVendorY += vLines.length * 4;
    }
    if (po.gstin) {
      doc.setFont('helvetica', 'bold');
      doc.text('GSTIN: ', 14, leftVendorY);
      doc.setFont('helvetica', 'normal');
      doc.text(po.gstin, 28, leftVendorY);
      leftVendorY += 4;
    }

    let rightDeliveryY = currentY + 9.5;
    const delAddress = po.deliveryAddress || branding.address;
    if (delAddress) {
      const dLines = doc.splitTextToSize(delAddress, 85);
      doc.text(dLines, 105, rightDeliveryY);
      rightDeliveryY += dLines.length * 4;
    }

    currentY = Math.max(leftVendorY, rightDeliveryY) + 5;

    const tableData: any[] = [];
    (po.items || []).forEach((item: any, index: number) => {
      const qty = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      const disc = Number(item.discount || 0);
      const gst = Number(item.gst || 0);
      const taxable = qty * rate * (1 - disc / 100);
      const total = Number(item.amount || taxable + (taxable * gst) / 100);

      tableData.push([
        index + 1,
        item.materialType || 'Material',
        item.item || item.description || '-',
        item.unit || 'Pcs',
        qty.toLocaleString('en-IN'),
        rate.toFixed(2),
        `${disc}%`,
        `${gst}%`,
        total.toFixed(2)
      ]);
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Sl.', 'Type', 'Item Description', 'Unit', 'Qty', 'Rate (Rs.)', 'Disc %', 'GST %', 'Amount (Rs.)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        4: { halign: 'center' },
        5: { halign: 'right' },
        6: { halign: 'center' },
        7: { halign: 'center' },
        8: { halign: 'right' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 20, bottom: 25 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 8;

    // Summary
    const grandTotal = Number(po.grandTotal || 0);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Amount in Words:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    const wordsLines = doc.splitTextToSize(numberToWordsIndian(grandTotal), 115);
    doc.text(wordsLines, 14, finalY + 4.5);

    let summaryY = finalY;
    const drawSummaryLine = (label: string, value: number, isBold: boolean = false) => {
      if (isBold) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }
      doc.text(label, 140, summaryY);
      doc.text(`Rs. ${value.toFixed(2)}`, 196, summaryY, { align: 'right' });
      summaryY += 5;
    };

    drawSummaryLine('Sub Total:', Number(po.subTotal || po.taxableAmount || 0));
    if (Number(po.discountTotal || 0) > 0) drawSummaryLine('Discount Total:', Number(po.discountTotal || 0));
    drawSummaryLine('GST Total:', Number(po.gstTotal || 0));
    if (Number(po.roundOff || 0) !== 0) drawSummaryLine('Round Off:', Number(po.roundOff || 0));

    doc.setDrawColor(200, 200, 200);
    doc.line(140, summaryY - 2, 196, summaryY - 2);

    drawSummaryLine('Grand Total:', grandTotal, true);

    finalY = Math.max(finalY + 18, summaryY) + 4;
    this.drawFooter(doc, branding, finalY, true);
    this.applyPageNumbers(doc);

    await PdfAuditService.logAction('Purchase Order', po.poNumber || 'PUR-DRAFT', 'Generated');
    return doc;
  }

  // ==========================================
  // 8. GRN (GOODS RECEIPT NOTE) PDF
  // ==========================================
  static async generateGrnPdf(grn: any, companyDetails?: any): Promise<jsPDF> {
    const doc = new jsPDF();
    const branding = this.getBranding(grn, companyDetails);
    const logoImg = await this.loadLogoImage(branding.logo);

    this.addWatermark(doc, 'GOODS RECEIPT');

    const rightDetails = [
      `GRN No: ${grn.grnNumber || 'GRN-DRAFT'}`,
      `Date: ${grn.grnDate ? new Date(grn.grnDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`,
      `PO Ref: ${grn.poNumber || '-'}`
    ];
    if (grn.invoiceNumber) rightDetails.push(`Supplier Inv: ${grn.invoiceNumber}`);
    if (grn.challanNumber) rightDetails.push(`Challan No: ${grn.challanNumber}`);
    if (grn.vehicleNumber) rightDetails.push(`Vehicle No: ${grn.vehicleNumber}`);

    let currentY = this.drawHeader(doc, branding, 'GOODS RECEIPT NOTE', rightDetails, logoImg);

    currentY = this.drawCustomerSection(
      doc,
      'Supplier / Vendor Details:',
      grn.vendorName,
      '',
      '',
      currentY,
      [
        { label: 'Warehouse / Location', value: grn.warehouse || 'Main Store' },
        { label: 'Received By', value: grn.receivedBy || grn.createdBy || 'Store Keeper' }
      ]
    );

    const tableData: any[] = [];
    (grn.items || []).forEach((item: any, index: number) => {
      tableData.push([
        index + 1,
        item.materialType || 'Material',
        item.item || '-',
        item.unit || 'Pcs',
        Number(item.poQuantity || 0).toLocaleString('en-IN'),
        Number(item.receivingQuantity || 0).toLocaleString('en-IN'),
        Number(item.rejectedQuantity || 0).toLocaleString('en-IN'),
        Number(item.acceptedQuantity || item.receivingQuantity - (item.rejectedQuantity || 0) || 0).toLocaleString('en-IN')
      ]);
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Sl.', 'Type', 'Item Name', 'Unit', 'PO Qty', 'Recd Qty', 'Rej Qty', 'Accepted Qty']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'center' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 20, bottom: 25 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 12;

    // Signatures & Remarks
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY, 196, finalY);
    finalY += 6;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);

    doc.text('Received By (Store):', 14, finalY);
    doc.text('Inspected By (QC):', 75, finalY);
    doc.text('Authorized Signatory:', 140, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('_______________________', 14, finalY + 12);
    doc.text('_______________________', 75, finalY + 12);
    doc.text('_______________________', 140, finalY + 12);

    this.applyPageNumbers(doc);
    await PdfAuditService.logAction('GRN', grn.grnNumber || 'GRN-DRAFT', 'Generated');
    return doc;
  }

  // ==========================================
  // SHARED UTILITY METHODS FOR ALL DOCUMENTS
  // ==========================================

  static async generatePdf(type: DocumentType, data: any, companyDetails?: any): Promise<jsPDF> {
    switch (type) {
      case 'Quotation':
        return this.generateQuotationPdf(data, companyDetails);
      case 'Proforma Invoice':
        return this.generateProformaInvoicePdf(data, companyDetails);
      case 'GST Invoice':
        return this.generateGstInvoicePdf(data, companyDetails);
      case 'Job Card':
        return this.generateJobCardPdf(data, companyDetails);
      case 'Delivery Challan':
        return this.generateDeliveryChallanPdf(data, companyDetails);
      case 'Payment Receipt':
        return this.generatePaymentReceiptPdf(data, companyDetails);
      case 'Purchase Order':
        return this.generatePurchaseOrderPdf(data, companyDetails);
      case 'GRN':
        return this.generateGrnPdf(data, companyDetails);
      default:
        throw new Error(`Unsupported document type: ${type}`);
    }
  }

  static async downloadPdf(type: DocumentType, data: any, companyDetails?: any): Promise<void> {
    const doc = await this.generatePdf(type, data, companyDetails);
    const num =
      data.quotationNumber ||
      data.piNumber ||
      data.invoiceNumber ||
      data.jobCardNumber ||
      data.challanNumber ||
      data.dcNumber ||
      data.receiptNumber ||
      data.poNumber ||
      data.grnNumber ||
      'DOC';
    const filename = this.sanitizeFilename(type, num, data.customerName || data.vendorName);
    doc.save(filename);
  }

  static async printPdf(type: DocumentType, data: any, companyDetails?: any): Promise<void> {
    const doc = await this.generatePdf(type, data, companyDetails);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    iframe.src = url;
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 300);
    };
  }

  static async getPreviewBlobUrl(type: DocumentType, data: any, companyDetails?: any): Promise<string> {
    const doc = await this.generatePdf(type, data, companyDetails);
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
  }
}
