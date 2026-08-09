import fs from 'fs';

let content = fs.readFileSync('src/features/billing/api.ts', 'utf-8');

const newMethod = `
  public static async createInvoiceFromDeliveryChallans(
    challanIds: string[],
    invoicedQuantities: Record<string, number>
  ): Promise<GSTInvoice> {
    this.initStorage();
    const companyId = AuthService.requireCurrentCompanyId();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    if (!['COMPANY_ADMIN', 'SUPER_ADMIN', 'ACCOUNTS'].includes(user.role)) {
      throw new Error('Unauthorized: Only Accounts or Admin can create invoices.');
    }

    if (!challanIds || challanIds.length === 0) {
      throw new Error('At least one Delivery Challan is required.');
    }

    const allChallans = await DeliveryChallanApiService.getChallans();
    const selectedChallans = allChallans.filter(c => challanIds.includes(c.id));
    if (selectedChallans.length !== challanIds.length) {
      throw new Error('One or more Delivery Challans not found.');
    }

    const commonCustomerId = selectedChallans[0].customerId;
    if (selectedChallans.some(c => c.customerId !== commonCustomerId)) {
      throw new Error('All Delivery Challans must belong to the same customer to be merged into one Invoice.');
    }

    if (selectedChallans.some(c => c.companyId !== companyId)) {
      throw new Error('Access Denied: One or more Challans belong to another company.');
    }

    const invoices = await this.getInvoices();
    const activeInvoices = invoices.filter(i => i.status !== 'Cancelled' && i.companyId === companyId);
    const invoicedQtyByDcItemId: Record<string, number> = {};
    for (const inv of activeInvoices) {
      for (const item of inv.items) {
        if (item.sourceDeliveryChallanItemId) {
          invoicedQtyByDcItemId[item.sourceDeliveryChallanItemId] = (invoicedQtyByDcItemId[item.sourceDeliveryChallanItemId] || 0) + item.quantity;
        }
      }
    }

    const newItems: GSTInvoiceItem[] = [];
    const piIds = new Set<string>();

    for (const dc of selectedChallans) {
      for (const dcItem of dc.items) {
        if (dcItem.proformaInvoiceId) piIds.add(dcItem.proformaInvoiceId);
        
        const requestedQty = invoicedQuantities[dcItem.id];
        if (requestedQty === undefined || requestedQty <= 0) continue;

        const previouslyInvoiced = invoicedQtyByDcItemId[dcItem.id] || 0;
        const availableQty = dcItem.currentDispatchQuantity - previouslyInvoiced;

        if (requestedQty > availableQty) {
          throw new Error(\`Invoice quantity (\${requestedQty}) exceeds available quantity (\${availableQty}) for item \${dcItem.productName} in DC \${dc.challanNumber}.\`);
        }

        newItems.push({
          id: \`invitem-\${Date.now()}-\${Math.random().toString(36).substring(2, 9)}\`,
          productId: dcItem.productId,
          productName: dcItem.productName,
          description: '',
          specification: dcItem.specification,
          quantity: requestedQty,
          unit: 'Nos',
          hsnSac: '',
          ratePerPiece: 0,
          discount: 0,
          taxableAmount: 0,
          gstRate: 18,
          cgst: 0,
          sgst: 0,
          igst: 0,
          itemAmount: 0,
          orderedQty: dcItem.orderedQuantity,
          previouslyInvoicedQty: previouslyInvoiced,
          companyId,
          customerId: commonCustomerId,
          quotationId: dcItem.quotationId,
          proformaInvoiceId: dcItem.proformaInvoiceId,
          productionOrderId: dcItem.productionOrderId,
          jobCardId: dcItem.jobCardId,
          sourceDispatchId: dcItem.dispatchId,
          sourceDeliveryChallanId: dc.id,
          sourceDeliveryChallanItemId: dcItem.id
        });
      }
    }

    if (newItems.length === 0) {
      throw new Error('No valid items selected for invoicing or selected quantities are zero.');
    }

    const pis = await Promise.all(Array.from(piIds).map(id => PIApiService.getPIById(id)));
    const customer = await CustomerMasterService.getCustomerById(commonCustomerId);
    if (!customer) throw new Error('Customer not found');

    const settings = await CompanySettingsService.getSettings();
    const companyStateCode = settings.stateCode || '27';
    let customerStateCode = '';
    
    // Attempt to extract state code from billing address or GSTIN
    const firstGstin = customer.gstinRecords?.[0]?.gstin;
    if (firstGstin && firstGstin.length >= 2) {
      customerStateCode = firstGstin.substring(0, 2);
    } else {
      customerStateCode = companyStateCode; // default to same state if unknown
    }

    const isIgst = companyStateCode !== customerStateCode;

    let subtotalPaise = 0;
    let cgstPaise = 0;
    let sgstPaise = 0;
    let igstPaise = 0;

    for (const item of newItems) {
      if (item.proformaInvoiceId) {
        const pi = pis.find(p => p?.id === item.proformaInvoiceId);
        if (pi) {
          const piItem = pi.items.find((i: any) => i.quotationOptionId === item.quotationId || i.productId === item.productId || (i.productName === item.productName && i.specification === item.specification));
          if (piItem) {
            item.description = piItem.description || '';
            item.unit = piItem.unit || 'Nos';
            item.hsnSac = piItem.hsnCode || '';
            item.ratePerPiece = piItem.unitRate || piItem.rate || 0;
            item.discount = piItem.discountAmount || 0; // we might want to scale discount based on qty
            item.gstRate = piItem.gstRate || 18;
          }
        }
      }

      const taxableValue = Math.max(0, (item.quantity * item.ratePerPiece) - item.discount);
      item.taxableAmount = taxableValue;
      
      const taxPaise = Math.round(toPaise(taxableValue) * (item.gstRate / 100));
      
      if (isIgst) {
        item.igst = fromPaise(taxPaise);
        item.cgst = 0;
        item.sgst = 0;
      } else {
        const half = Math.round(taxPaise / 2);
        item.cgst = fromPaise(half);
        item.sgst = fromPaise(taxPaise - half);
        item.igst = 0;
      }
      item.itemAmount = item.taxableAmount + item.cgst + item.sgst + item.igst;

      subtotalPaise += toPaise(item.taxableAmount);
      cgstPaise += toPaise(item.cgst);
      sgstPaise += toPaise(item.sgst);
      igstPaise += toPaise(item.igst);
    }

    const currentYear = new Date().getFullYear();
    const nextYear = String(currentYear + 1).slice(2);
    const fyPrefix = \`INV/\${currentYear}-\${nextYear}/\`;
    const sameYear = invoices.filter(o => o.invoiceNumber?.startsWith(fyPrefix) && o.companyId === companyId);
    
    let nextSeq = sameYear.length + 1;
    let invoiceNumber = '';
    while (true) {
      const trialNumber = \`\${fyPrefix}\${String(nextSeq).padStart(4, '0')}\`;
      const collision = invoices.some(i => i.invoiceNumber === trialNumber && i.companyId === companyId);
      if (!collision) {
        invoiceNumber = trialNumber;
        break;
      }
      nextSeq++;
    }

    const grandTotalPaise = subtotalPaise + cgstPaise + sgstPaise + igstPaise;
    const roundOff = Math.round(grandTotalPaise / 100) * 100 - grandTotalPaise;
    const finalTotal = grandTotalPaise + roundOff;

    const newInvoice: GSTInvoice = {
      id: \`inv-\${Date.now()}\`,
      companyId,
      invoiceNumber,
      invoiceDate: new Date().toISOString().split('T')[0],
      customerId: commonCustomerId,
      customerName: customer.displayName || customer.companyName,
      customerCode: customer.customerCode,
      billingAddress: customer.billingAddresses?.[0]?.address || '',
      shippingAddress: customer.shippingAddresses?.[0]?.address || customer.billingAddresses?.[0]?.address || '',
      customerSnapshot: JSON.stringify(customer),
      companySnapshot: JSON.stringify(settings),
      gstin: customer.gstinRecords?.[0]?.gstin || '',
      placeOfSupply: customer.gstinRecords?.[0]?.state || '',
      customerStateCode,
      companyStateCode,
      linkedDcNumber: selectedChallans.map(c => c.challanNumber).join(', '),
      linkedDcId: challanIds,
      salesExecutive: '',
      paymentTerms: 'Immediate',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'Draft',
      items: newItems,
      subtotal: fromPaise(subtotalPaise),
      itemDiscount: 0,
      invoiceDiscount: 0,
      taxableAmount: fromPaise(subtotalPaise),
      cgst: fromPaise(cgstPaise),
      sgst: fromPaise(sgstPaise),
      igst: fromPaise(igstPaise),
      roundOff: fromPaise(roundOff),
      grandTotal: fromPaise(finalTotal),
      advanceAdjusted: 0,
      netPayable: fromPaise(finalTotal),
      amountReceived: 0,
      balanceDue: fromPaise(finalTotal),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.userName,
      createdByUserId: user.userId,
      createdByRole: user.role,
      auditHistory: [{
        id: \`ah-\${Date.now()}\`,
        timestamp: new Date().toISOString(),
        user: user.userName,
        userId: user.userId,
        role: user.role,
        action: 'Invoice Generated',
        remarks: \`Generated from DC \${selectedChallans.map(c => c.challanNumber).join(', ')}\`
      }]
    };

    invoices.push(newInvoice);
    localStorage.setItem(STORAGE_INVOICES, JSON.stringify(invoices));
    return newInvoice;
  }
`;

const insertIndex = content.indexOf('public static async saveInvoice');
content = content.slice(0, insertIndex) + newMethod + '\n\n  ' + content.slice(insertIndex);

fs.writeFileSync('src/features/billing/api.ts', content);
