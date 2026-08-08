import { EstimateJob } from '../../estimate/job-entry/types';
import { QuotationHeader, QuotationItem, QuotationItemOption } from '../types';
import { QuotationApiService } from './api';

export class QuotationIntegrationService {
  /**
   * Converts an Estimate into a partial Quotation Header with customer-facing details only.
   */
  static convertEstimateToQuotation(estimate: EstimateJob): Partial<QuotationHeader> {
    const itemOption: QuotationItemOption = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: 'temp-item-id',
      description: estimate.productDescription,
      paperType: estimate.paperName,
      gsm: estimate.gsmValue,
      colors: `${estimate.frontColor}+${estimate.backColor} Colour`,
      printingSide: estimate.printingType as any,
      fileAccessories: estimate.fileAccessories,
      layoutData: estimate.layoutData,
      quantity: estimate.finalQuantity,
      rate: estimate.ratePerPiece,
      total: estimate.grandTotal,
      gstRate: 18,
      status: 'Pending'
    };

    const item: QuotationItem = {
      id: Math.random().toString(36).substr(2, 9),
      quotationId: '',
      productName: estimate.productName,
      productDescription: estimate.productDescription,
      openSize: `${estimate.openWidth}x${estimate.openHeight} in`,
      closeSize: `${estimate.closeWidth}x${estimate.closeHeight} in`,
      finishedSize: `${estimate.finishedWidth}x${estimate.finishedHeight} in`,
      options: [itemOption]
    };

    // Strip internal costing details by simply not including them in the mapping.
    return {
      quotationNumber: QuotationApiService.generateQuotationNumber(),
      customerId: estimate.customerId,
      customerName: estimate.customerName,
      subject: `Quotation for ${estimate.productName}`,
      items: [item],
      status: 'Draft',
      currentRevision: 0,
      date: new Date().toISOString().split('T')[0],
      revisions: [],
      terms: [
        { id: '1', title: 'Validity', content: 'This quotation is valid for 15 days.' },
        { id: '2', title: 'GST', content: 'GST extra as applicable.' }
      ]
    };
  }
}
