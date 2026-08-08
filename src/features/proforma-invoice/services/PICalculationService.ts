import { ProformaInvoice, PIItem, PIChargeItem } from '../types';

export class PICalculationService {
  /**
   * Calculates item-level discount, taxable amount, GST (CGST/SGST vs IGST), and line total.
   */
  static calculatePIItem(item: Partial<PIItem>, isInterState: boolean): PIItem {
    const qty = Math.max(0, item.quantity || 0);
    const unitRate = Math.max(0, item.unitRate ?? item.rate ?? 0);
    const discountPercent = Math.max(0, item.discountPercent || 0);
    const gstRate = item.gstRate !== undefined ? item.gstRate : 18;

    const grossAmount = qty * unitRate;
    const discountAmount = Number(((grossAmount * discountPercent) / 100).toFixed(2));
    const taxableAmount = Number((grossAmount - discountAmount).toFixed(2));

    const totalGst = Number(((taxableAmount * gstRate) / 100).toFixed(2));
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
      igst = totalGst;
    } else {
      cgst = Number((totalGst / 2).toFixed(2));
      sgst = Number((totalGst - cgst).toFixed(2));
    }

    const lineTotal = Number((taxableAmount + totalGst).toFixed(2));

    return {
      id: item.id || Math.random().toString(36).substring(2, 11),
      quotationItemId: item.quotationItemId || '',
      quotationOptionId: item.quotationOptionId || '',
      productId: item.productId,
      productName: item.productName || '',
      description: item.description || '',
      specification: item.specification || '',
      openSize: item.openSize,
      closeSize: item.closeSize,
      finishedSize: item.finishedSize,
      paperType: item.paperType,
      gsm: item.gsm,
      parentSheet: item.parentSheet,
      printingColour: item.printingColour,
      fourColour: item.fourColour,
      printingSide: item.printingSide,
      finishing: item.finishing,
      fileAccessories: item.fileAccessories,
      layoutData: item.layoutData,
      quantity: qty,
      unit: item.unit || 'Pcs',
      unitRate: unitRate,
      rate: unitRate,
      discountPercent,
      discountAmount,
      taxableAmount,
      gstRate,
      cgst,
      sgst,
      igst,
      lineTotal,
      amount: lineTotal,
      hsnCode: item.hsnCode
    };
  }

  /**
   * Recalculates all financial totals for a Proforma Invoice header.
   */
  static calculateTotals(pi: Partial<ProformaInvoice>, companyStateCode: string = '19'): Partial<ProformaInvoice> {
    const stateCode = pi.stateCode || (pi.gstin ? pi.gstin.substring(0, 2) : '');
    const isInterState = Boolean(stateCode && companyStateCode && stateCode !== companyStateCode);

    const items = (pi.items || []).map(item => this.calculatePIItem(item, isInterState));

    const itemSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitRate), 0);
    const itemDiscountTotal = items.reduce((sum, item) => sum + item.discountAmount, 0);
    const itemTaxableSubtotal = items.reduce((sum, item) => sum + item.taxableAmount, 0);

    // Calculate charges
    const processCharge = (charge?: PIChargeItem) => {
      if (!charge || charge.amount <= 0) return { taxable: 0, nonTaxable: 0, gst: 0, cgst: 0, sgst: 0, igst: 0 };
      if (charge.isTaxable) {
        const gstRate = charge.gstRate || 18;
        const gst = Number(((charge.amount * gstRate) / 100).toFixed(2));
        if (isInterState) {
          return { taxable: charge.amount, nonTaxable: 0, gst, cgst: 0, sgst: 0, igst: gst };
        } else {
          const cgst = Number((gst / 2).toFixed(2));
          const sgst = Number((gst - cgst).toFixed(2));
          return { taxable: charge.amount, nonTaxable: 0, gst, cgst, sgst, igst: 0 };
        }
      } else {
        return { taxable: 0, nonTaxable: charge.amount, gst: 0, cgst: 0, sgst: 0, igst: 0 };
      }
    };

    const freight = processCharge(pi.freightCharge);
    const packing = processCharge(pi.packingCharge);
    const other = processCharge(pi.otherCharge);

    const chargesTaxableSubtotal = freight.taxable + packing.taxable + other.taxable;
    const totalTaxableAmount = Number((itemTaxableSubtotal + chargesTaxableSubtotal).toFixed(2));

    const totalCgst = Number((items.reduce((s, i) => s + i.cgst, 0) + freight.cgst + packing.cgst + other.cgst).toFixed(2));
    const totalSgst = Number((items.reduce((s, i) => s + i.sgst, 0) + freight.sgst + packing.sgst + other.sgst).toFixed(2));
    const totalIgst = Number((items.reduce((s, i) => s + i.igst, 0) + freight.igst + packing.igst + other.igst).toFixed(2));

    const totalGst = Number((totalCgst + totalSgst + totalIgst).toFixed(2));
    const nonTaxableChargesTotal = freight.nonTaxable + packing.nonTaxable + other.nonTaxable;

    const unroundedTotal = totalTaxableAmount + totalGst + nonTaxableChargesTotal;
    const grandTotal = Math.round(unroundedTotal);
    const roundOff = Number((grandTotal - unroundedTotal).toFixed(2));

    // Advance Requirement Calculation
    let advanceRequiredAmount = 0;
    const advanceType = pi.advanceType || 'Percentage';
    const advanceValue = pi.advanceValue !== undefined ? pi.advanceValue : 50;

    if (advanceType === 'Percentage') {
      advanceRequiredAmount = Number(((grandTotal * advanceValue) / 100).toFixed(2));
    } else if (advanceType === 'Fixed Amount') {
      advanceRequiredAmount = Math.min(grandTotal, Math.max(0, advanceValue));
    } else {
      advanceRequiredAmount = 0;
    }

    // Payments Received & Balance Due Calculation
    const validPayments = pi.payments || [];
    const totalReceived = Number(validPayments.reduce((s, p) => s + (p.amount || 0), 0).toFixed(2));
    const balanceDue = Number(Math.max(0, grandTotal - totalReceived).toFixed(2));

    return {
      ...pi,
      items,
      subtotal: itemTaxableSubtotal,
      itemDiscountTotal,
      chargesTaxableSubtotal,
      taxableAmount: totalTaxableAmount,
      cgst: totalCgst,
      sgst: totalSgst,
      igst: totalIgst,
      nonTaxableChargesTotal,
      roundOff,
      grandTotal,
      advanceType,
      advanceValue,
      advanceRequiredAmount,
      advanceAmount: advanceRequiredAmount,
      totalReceived,
      balanceDue,
      balanceAmount: balanceDue
    };
  }
}
