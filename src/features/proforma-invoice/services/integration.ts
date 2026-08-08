import { ProformaInvoice, PIItem } from '../types';
import { QuotationHeader, QuotationItem, QuotationItemOption } from '../../quotation/types';
import { PICalculationService } from './PICalculationService';

export class PIIntegrationService {
  /**
   * Converts selected quotation items (Accepted ones ONLY) into PI items with complete snapshots.
   */
  static convertQuotationToPIItems(quotation: QuotationHeader, companyStateCode: string = '19'): PIItem[] {
    const items: PIItem[] = [];
    const customerStateCode = (quotation as any).customerStateCode || (quotation.gstin ? quotation.gstin.substring(0, 2) : '');
    const isInterState = Boolean(customerStateCode && companyStateCode && customerStateCode !== companyStateCode);

    quotation.items.forEach(qItem => {
      (qItem.options || []).forEach(opt => {
        if (opt.status === 'Accepted') {
          const specParts: string[] = [];
          if (opt.paperType) specParts.push(opt.paperType);
          if (opt.gsm) specParts.push(`${opt.gsm} GSM`);
          if (opt.colors) specParts.push(opt.colors);
          if (opt.printingSide) specParts.push(opt.printingSide);
          if (opt.fileAccessories && opt.fileAccessories !== 'None') specParts.push(`Accessories: ${opt.fileAccessories}`);
          if ((opt as any).finishing) specParts.push(`Finishing: ${(opt as any).finishing}`);

          const specificationStr = specParts.length > 0 ? specParts.join(' | ') : qItem.productDescription || 'Custom Printed Product';

          const rawItem: Partial<PIItem> = {
            id: `pii-${Math.random().toString(36).substring(2, 9)}`,
            quotationItemId: qItem.id,
            quotationOptionId: opt.id,
            productId: (qItem as any).productId || '',
            productName: qItem.productName,
            description: qItem.productDescription || qItem.productName,
            specification: specificationStr,
            openSize: qItem.openSize,
            closeSize: qItem.closeSize,
            finishedSize: qItem.finishedSize,
            paperType: opt.paperType,
            gsm: opt.gsm,
            parentSheet: (opt as any).parentSheet || '',
            printingColour: opt.colors || '4 Colour',
            fourColour: opt.colors ? opt.colors.toLowerCase().includes('4') : true,
            printingSide: opt.printingSide || 'Single Side',
            finishing: (opt as any).finishing || '',
            fileAccessories: opt.fileAccessories,
            layoutData: opt.layoutData,
            quantity: opt.quantity,
            unit: 'Pcs',
            unitRate: opt.rate,
            discountPercent: 0,
            gstRate: opt.gstRate !== undefined ? opt.gstRate : 18,
            hsnCode: opt.hsnCode || (qItem as any).hsnSac || '4911'
          };

          const calculated = PICalculationService.calculatePIItem(rawItem, isInterState);
          items.push(calculated);
        }
      });
    });

    return items;
  }
}

