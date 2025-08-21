import Papa from 'papaparse'
import { 
  CSVParseResult, 
  CSVError, 
  ImportPreview, 
  ImportResult, 
  FieldMapping,
  PARTY_CSV_CONFIG,
  SALES_CSV_CONFIG,
  INVOICE_CSV_CONFIG
} from '@/types/upload'
import { Party } from '@/types/party'
import { PartyStorage } from './storage'
import { InvoiceStorage } from './invoiceStorage'

export class CSVService {
  static parseCSV(file: File): Promise<CSVParseResult> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          const headers = results.meta.fields || []
          const data = results.data as Record<string, any>[]
          const errors: CSVError[] = []

          // Add parsing errors
          if (results.errors.length > 0) {
            results.errors.forEach((error, index) => {
              errors.push({
                row: error.row || index,
                field: '',
                value: '',
                message: error.message,
                type: 'format'
              })
            })
          }

          resolve({
            headers,
            data,
            errors,
            validRows: data.length - errors.length,
            invalidRows: errors.length
          })
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`))
        }
      })
    })
  }

  static validateData(
    data: Record<string, any>[], 
    type: 'parties' | 'sales' | 'invoices'
  ): { validData: Record<string, any>[], errors: CSVError[] } {
    // Validation disabled per user preference: accept all rows as valid
    // Preserve original data order; do not produce validation errors.
    const validData: Record<string, any>[] = [...data]
    const errors: CSVError[] = []
    return { validData, errors }
  }

  private static validateFieldType(value: any, type: string): boolean {
    const stringValue = value?.toString().trim()
    if (!stringValue) return true // Empty values are handled by required validation

    switch (type) {
      case 'email':
        return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(stringValue)
      case 'phone':
        return /^[\+]?[1-9][\d]{0,15}$/.test(stringValue)
      case 'number':
        return !isNaN(parseFloat(stringValue))
      case 'date':
        return !isNaN(Date.parse(stringValue))
      case 'string':
      default:
        return true
    }
  }

  static generatePreview(
    parseResult: CSVParseResult, 
    type: 'parties' | 'sales' | 'invoices'
  ): ImportPreview {
    const { validData, errors } = this.validateData(parseResult.data, type)
    const config = 
      type === 'parties' ? PARTY_CSV_CONFIG :
      type === 'sales' ? SALES_CSV_CONFIG :
      INVOICE_CSV_CONFIG
    
    // Create field mappings
    const fieldMappings: Record<string, string> = {}
    config.fieldMappings.forEach(mapping => {
      if (parseResult.headers.includes(mapping.csvField)) {
        fieldMappings[mapping.csvField] = mapping.systemField
      }
    })

    return {
      totalRows: parseResult.data.length,
      validRows: validData.length,
      invalidRows: parseResult.data.length - validData.length,
      errors: [...parseResult.errors, ...errors],
      sampleData: validData.slice(0, 5), // Show first 5 valid rows
      fieldMappings
    }
  }

  static async importParties(validData: Record<string, any>[]): Promise<ImportResult> {
    let imported = 0
    let skipped = 0
    const errors: CSVError[] = []

    try {
      for (let i = 0; i < validData.length; i++) {
        const row = validData[i]
        
        try {
          // Check if party already exists (by phone number)
          const existingParties = PartyStorage.getAll()
          const existingParty = existingParties.find(p => p.phoneNumber === (row.phoneNumber || row.phone))
          
          if (existingParty) {
            skipped++
            continue
          }

          const billingAddress = {
            street: row.billingStreet || row.street || '',
            city: row.billingCity || row.city || '',
            state: row.billingState || row.state || '',
            pincode: row.billingPincode || row.pincode || '',
            country: row.billingCountry || row.country || 'India'
          }

          const shippingAddress = {
            street: row.shippingStreet || row.billingStreet || row.street || '',
            city: row.shippingCity || row.billingCity || row.city || '',
            state: row.shippingState || row.billingState || row.state || '',
            pincode: row.shippingPincode || row.billingPincode || row.pincode || '',
            country: row.shippingCountry || row.billingCountry || row.country || 'India'
          }

          // Check if shipping address is different from billing
          const addressesMatch = JSON.stringify(billingAddress) === JSON.stringify(shippingAddress)
          
          const party: Omit<Party, 'id'> = {
            partyName: row.partyName || row.name || `Party ${i + 1}`,
            email: row.email || '',
            phoneNumber: row.phoneNumber || row.phone || '',
            gstin: row.gstin || '',
            gstType: (row.gstType || 'unregistered') as 'unregistered' | 'consumer' | 'registered' | 'composition' | 'overseas',
            state: row.state || '',
            billingAddress,
            shippingAddress: addressesMatch ? billingAddress : shippingAddress,
            useShippingAddress: !addressesMatch,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          PartyStorage.save(party as Party)
          imported++
        } catch (error) {
          errors.push({
            row: i + 1,
            field: '',
            value: '',
            message: `Failed to import row: ${error instanceof Error ? error.message : 'Unknown error'}`,
            type: 'validation'
          })
          skipped++
        }
      }

      return {
        success: true,
        imported,
        skipped,
        errors,
        message: `Successfully imported ${imported} parties. ${skipped} rows were skipped.`
      }
    } catch (error) {
      return {
        success: false,
        imported,
        skipped,
        errors,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  static async importSales(validData: Record<string, any>[]): Promise<ImportResult> {
    let imported = 0
    let skipped = 0
    const errors: CSVError[] = []

    try {
      // Get all parties to match with sales data
      const parties = PartyStorage.getAll()
      
      for (let i = 0; i < validData.length; i++) {
        const row = validData[i]
        
        try {
          // For demo purposes, we'll create invoices with the first available party
          // In a real system, you'd match based on sender/receiver information
          const customer = parties[0] // Use first party as default customer
          
          if (!customer) {
            errors.push({
              row: i + 1,
              field: 'customer',
              value: '',
              message: 'No customers available. Please add parties first.',
              type: 'validation'
            })
            skipped++
            continue
          }

          // Create invoice item from CSV data
          const invoiceItem = {
            id: `item_${Date.now()}_${i}`,
            itemNumber: row.bookingReference || `ITEM-${i + 1}`,
            invoiceDate: row.bookingDate,
            bookingDate: row.bookingDate,
            destination: row.destination,
            quantity: parseFloat(row.weight) || 1,
            unit: 1,
            pricePerUnit: parseFloat(row.retailPrice) || 0,
            discount: { 
              percentage: 0, 
              amount: parseFloat(row.discounts) || 0 
            },
            tax: { 
              percentage: 18, 
              amount: parseFloat(row.taxes) || 0 
            },
            totalAmount: parseFloat(row.finalCollected) || 0
          }

          // Create invoice object
          const invoice = {
            id: '',
            invoiceNumber: '',
            invoiceDate: row.bookingDate,
            customer,
            billingAddress: customer.billingAddress,
            shippingAddress: customer.shippingAddress || customer.billingAddress,
            stateOfSupply: customer.state,
            items: [invoiceItem],
            additionalCharges: {
              shipping: parseFloat(row.charges) || 0,
              packaging: 0,
              fuelCharges: 0,
              tcs: 0,
              otherCharges: 0
            },
            paymentInfo: {
              paymentType: 'cash' as any,
              totalAmount: parseFloat(row.finalCollected) || 0,
              receivedAmount: parseFloat(row.finalCollected) || 0,
              balance: 0,
              status: 'paid' as any
            },
            roundOff: 0,
            totalAmount: parseFloat(row.finalCollected) || 0,
            receivedAmount: parseFloat(row.finalCollected) || 0,
            balance: 0,
            status: 'paid' as any,
            attachments: [],
            notes: `Imported from CSV - Consignment: ${row.consignmentNo || 'N/A'}`,
            createdAt: '',
            updatedAt: ''
          }

          InvoiceStorage.save(invoice as any)
          imported++
        } catch (error) {
          errors.push({
            row: i + 1,
            field: '',
            value: '',
            message: `Failed to import row: ${error instanceof Error ? error.message : 'Unknown error'}`,
            type: 'validation'
          })
          skipped++
        }
      }

      return {
        success: true,
        imported,
        skipped,
        errors,
        message: `Successfully imported ${imported} sales records. ${skipped} rows were skipped.`
      }
    } catch (error) {
      return {
        success: false,
        imported,
        skipped,
        errors,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  static async processInvoiceImport(data: any[]): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: [],
      message: ''
    };

    // Build a quick lookup of existing party names (case-insensitive)
    const existingParties = PartyStorage.getAll();
    const partyNameSet = new Set<string>(
      existingParties
        .map(p => (p.partyName || '').trim().toLowerCase())
        .filter(n => n.length > 0)
    );

    // Using traditional for loop instead of for...of to avoid downlevelIteration issues
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Sender Name must correspond to an existing Party name
        const rawSenderName = (row['SENDER NAME'] ?? '').toString().trim();
        const senderNameKey = rawSenderName.toLowerCase();

        if (!rawSenderName || !partyNameSet.has(senderNameKey)) {
          result.skipped++;
          result.errors.push({
            row: i + 1,
            field: 'SENDER NAME',
            value: rawSenderName,
            message: 'Party_name is not exist in system, Please create party first!',
            type: 'validation'
          });
          continue;
        }

        // Map CSV row to invoice data structure
        const invoiceData = {
          bookingDate: new Date(row['DATE OF BOOKING']),
          bookingReference: row['BOOKING REFERENCE'],
          consignmentNo: row['CONSIGNMENT NO'],
          mode: row['MODE'],
          serviceType: row['SERVICE TYPE'],
          weight: parseFloat(row['WEIGHT (IN Kg)']),
          prepaidAmount: parseFloat(row['PREPAID AMOUNT']),
          finalCollected: row['FINAL COLLECTED'] ? parseFloat(row['FINAL COLLECTED']) : 0,
          retailPrice: parseFloat(row['RETAIL PRICE']),
          sender: {
            name: row['SENDER NAME'],
            phone: row['SENDER PHONE'],
            address: row['SENDER ADDRESS']
          },
          recipient: {
            name: row['RECIPIENT NAME'],
            phone: row['RECIPIENT PHONE'],
            address: row['RECIPIENT ADDRESS']
          },
          // Optional fields with default values
          bookingMode: row['MODE OF BOOKING'] || 'Online',
          shipmentType: row['SHIPMENT TYPE'] || 'Domestic',
          riskSurcharge: {
            amount: row['RISK SURCHARGE AMOUNT'] ? parseFloat(row['RISK SURCHARGE AMOUNT']) : 0,
            type: row['RISK SURCHARGE TYPE'] || 'Standard'
          },
          contents: row['CONTENTS'] || '',
          declaredValue: row['DECLARED VALUE'] ? parseFloat(row['DECLARED VALUE']) : 0,
          ewayBill: row['EWAY-BILL'] || '',
          gstInvoice: row['GSTInvoice'] || '',
          customer: row['CUSTOMER'] || 'Walk-in',
          serviceCode: row['SERVICE CODE'] || 'STD',
          region: row['REGION'] || '',
          payment: {
            mode: row['PAYMENT MODE'] || 'Cash',
            utr: row['PAYMENT UTR'] || ''
          },
          chargeableWeight: row['CHARGEABLE WEIGHT'] ? parseFloat(row['CHARGEABLE WEIGHT']) : 0,
          employee: {
            code: row['EMPLOYEE CODE'] || '',
            discountPercent: row['EMPLOYEE DISCOUNT PERCENT'] ? parseFloat(row['EMPLOYEE DISCOUNT PERCENT']) : 0,
            discountAmount: row['EMPLOYEE DISCOUNT AMOUNT'] ? parseFloat(row['EMPLOYEE DISCOUNT AMOUNT']) : 0
          },
          promoCode: row['PROMOCODE'] || '',
          promoCodeDiscount: row['PROMOCODE DISCOUNT'] ? parseFloat(row['PROMOCODE DISCOUNT']) : 0,
          packing: {
            material: row['PACKING MATERIAL'] || '',
            stretchFilms: row['NO OF STRETCH FILMS'] ? parseInt(row['NO OF STRETCH FILMS']) : 0
          },
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // TODO: Uncomment and implement actual invoice creation
        // await InvoiceStorage.create(invoiceData);
        console.log('Creating invoice:', invoiceData);
        
        result.imported++;
      } catch (error) {
        console.error('Error processing invoice row:', error);
        result.skipped++;
        result.errors.push({
          row: i + 1,
          field: '',
          value: JSON.stringify(row),
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'validation'
        });
      }
    }

    result.message = `Successfully imported ${result.imported} invoices, skipped ${result.skipped}`;
    return result;
  }

  static async processPartyImport(data: any[]): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: [],
      message: ''
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const existingParties = PartyStorage.getAll();
        const existingParty = existingParties.find(p => p.phoneNumber === (row.phoneNumber || row.phone));
        
        if (existingParty) {
          result.skipped++;
          continue;
        }

        const billingAddress = {
          street: row.billingStreet || row.street || '',
          city: row.billingCity || row.city || '',
          state: row.billingState || row.state || '',
          pincode: row.billingPincode || row.pincode || '',
          country: row.billingCountry || row.country || 'India'
        };

        const shippingAddress = {
          street: row.shippingStreet || row.billingStreet || row.street || '',
          city: row.shippingCity || row.billingCity || row.city || '',
          state: row.shippingState || row.billingState || row.state || '',
          pincode: row.shippingPincode || row.billingPincode || row.pincode || '',
          country: row.shippingCountry || row.billingCountry || row.country || 'India'
        };

        const addressesMatch = JSON.stringify(billingAddress) === JSON.stringify(shippingAddress);
        
        const party: Omit<Party, 'id'> = {
          partyName: row.partyName || row.name || `Party ${i + 1}`,
          email: row.email || '',
          phoneNumber: row.phoneNumber || row.phone || '',
          gstin: row.gstin || '',
          gstType: (row.gstType || 'unregistered') as 'unregistered' | 'consumer' | 'registered' | 'composition' | 'overseas',
          state: row.state || '',
          billingAddress: billingAddress,
          shippingAddress: addressesMatch ? billingAddress : shippingAddress,
          useShippingAddress: !addressesMatch,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        PartyStorage.save(party as Party);
        result.imported++;
      } catch (error) {
        result.skipped++;
        result.errors.push({
          row: i + 1,
          field: '',
          value: JSON.stringify(row),
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'validation'
        });
      }
    }

    result.message = `Successfully imported ${result.imported} parties, skipped ${result.skipped}`;
    return result;
  }

  static async processSalesImport(data: any[]): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: [],
      message: ''
    };

    // Traditional for loop to avoid downlevelIteration issues
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Map CSV row to sales data structure (aligned with SALES_CSV_CONFIG)
        const salesData = {
          bookingDate: new Date(row['DATE OF BOOKING']),
          bookingReference: row['BOOKING REFERENCE'],
          consignmentNo: row['CONSIGNMENT NO'],
          mode: row['MODE'],
          serviceType: row['SERVICE TYPE'],
          weight: parseFloat(row['WEIGHT (IN Kg)']),
          prepaidAmount: parseFloat(row['PREPAID AMOUNT']),
          finalCollected: row['FINAL COLLECTED'] ? parseFloat(row['FINAL COLLECTED']) : 0,
          retailPrice: parseFloat(row['RETAIL PRICE']),
          sender: {
            name: row['SENDER NAME'],
            phone: row['SENDER PHONE'],
            address: row['SENDER ADDRESS']
          },
          recipient: {
            name: row['RECIPIENT NAME'],
            phone: row['RECIPIENT PHONE'],
            address: row['RECIPIENT ADDRESS']
          },
          bookingMode: row['MODE OF BOOKING'] || 'Online',
          shipmentType: row['SHIPMENT TYPE'] || 'Domestic',
          riskSurcharge: {
            amount: row['RISK SURCHARGE AMOUNT'] ? parseFloat(row['RISK SURCHARGE AMOUNT']) : 0,
            type: row['RISK SURCHARGE TYPE'] || 'Standard'
          },
          contents: row['CONTENTS'] || '',
          declaredValue: row['DECLARED VALUE'] ? parseFloat(row['DECLARED VALUE']) : 0,
          ewayBill: row['EWAY-BILL'] || '',
          gstInvoice: row['GSTInvoice'] || '',
          customer: row['CUSTOMER'] || 'Walk-in',
          serviceCode: row['SERVICE CODE'] || 'STD',
          region: row['REGION'] || '',
          payment: {
            mode: row['PAYMENT MODE'] || 'Cash',
            utr: row['PAYMENT UTR'] || ''
          },
          chargeableWeight: row['CHARGEABLE WEIGHT'] ? parseFloat(row['CHARGEABLE WEIGHT']) : 0,
          employee: {
            code: row['EMPLOYEE CODE'] || '',
            discountPercent: row['EMPLOYEE DISCOUNT PERCENT'] ? parseFloat(row['EMPLOYEE DISCOUNT PERCENT']) : 0,
            discountAmount: row['EMPLOYEE DISCOUNT AMOUNT'] ? parseFloat(row['EMPLOYEE DISCOUNT AMOUNT']) : 0
          },
          promoCode: row['PROMOCODE'] || '',
          promoCodeDiscount: row['PROMOCODE DISCOUNT'] ? parseFloat(row['PROMOCODE DISCOUNT']) : 0,
          packing: {
            material: row['PACKING MATERIAL'] || '',
            stretchFilms: row['NO OF STRETCH FILMS'] ? parseInt(row['NO OF STRETCH FILMS']) : 0
          },
          status: 'recorded',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Map to Invoice model and persist using InvoiceStorage with a 'sale' marker
        const parties = PartyStorage.getAll();
        const matchedCustomer = parties.find(p => 
          p.phoneNumber === (salesData.sender?.phone || '') ||
          p.partyName?.toLowerCase() === (salesData.sender?.name || '').toLowerCase()
        ) || parties[0];

        if (!matchedCustomer) {
          throw new Error('No parties found to associate as customer. Please add parties first.');
        }

        const invoiceItem = {
          id: `item_${Date.now()}_${i}`,
          itemNumber: salesData.bookingReference || `ITEM-${i + 1}`,
          invoiceDate: (salesData.bookingDate instanceof Date ? salesData.bookingDate : new Date(salesData.bookingDate)).toISOString().split('T')[0],
          bookingDate: (salesData.bookingDate instanceof Date ? salesData.bookingDate : new Date(salesData.bookingDate)).toISOString().split('T')[0],
          destination: salesData.recipient?.address || '',
          quantity: Number.isFinite(salesData.weight) ? salesData.weight : 1,
          unit: 1 as any,
          pricePerUnit: Number.isFinite(salesData.retailPrice) ? salesData.retailPrice : 0,
          discount: { percentage: Number.isFinite(salesData.employee?.discountPercent) ? salesData.employee.discountPercent : 0, amount: Number.isFinite(salesData.employee?.discountAmount) ? salesData.employee.discountAmount : 0 },
          tax: { percentage: 18, amount: 0 },
          totalAmount: Number.isFinite(salesData.finalCollected) ? salesData.finalCollected : (Number.isFinite(salesData.retailPrice) ? salesData.retailPrice : 0)
        } as any;

        const invoice = {
          id: '',
          invoiceNumber: '',
          invoiceDate: invoiceItem.invoiceDate,
          customer: matchedCustomer,
          billingAddress: matchedCustomer.billingAddress,
          shippingAddress: matchedCustomer.shippingAddress || matchedCustomer.billingAddress,
          stateOfSupply: matchedCustomer.state,
          items: [invoiceItem],
          additionalCharges: {
            shipping: 0,
            packaging: 0,
            fuelCharges: 0,
            tcs: 0,
            otherCharges: 0
          },
          paymentInfo: {
            paymentType: (salesData.payment?.mode || 'cash') as any,
            totalAmount: invoiceItem.totalAmount,
            receivedAmount: invoiceItem.totalAmount,
            balance: 0,
            status: 'paid' as any
          },
          roundOff: 0,
          totalAmount: invoiceItem.totalAmount,
          receivedAmount: invoiceItem.totalAmount,
          balance: 0,
          status: 'paid' as any,
          attachments: [],
          notes: `Sale import - Consignment: ${salesData.consignmentNo || 'N/A'} | Mode: ${salesData.mode || ''} | Service: ${salesData.serviceType || ''}`,
          createdAt: '',
          updatedAt: '',
          // Distinguish sales persisted as invoices
          recordType: 'sale'
        } as any;

        InvoiceStorage.save(invoice as any);

        result.imported++;
      } catch (error) {
        result.skipped++;
        result.errors.push({
          row: i + 1,
          field: '',
          value: JSON.stringify(row),
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'validation'
        });
      }
    }

    result.message = `Successfully imported ${result.imported} sales, skipped ${result.skipped}`;
    return result;
  }

  static async processCSVImport(data: any[], type: 'parties' | 'sales' | 'invoices'): Promise<ImportResult> {
    switch (type) {
      case 'parties':
        return this.processPartyImport(data);
      case 'sales':
        // @ts-ignore - processSalesImport might not be defined yet
        return this.processSalesImport ? this.processSalesImport(data) : {
          success: false,
          imported: 0,
          skipped: data.length,
          errors: [{
            row: 0,
            field: '',
            value: '',
            message: 'Sales import not implemented',
            type: 'validation'
          }],
          message: 'Sales import is not implemented yet'
        };
      case 'invoices':
        return this.processInvoiceImport(data);
      default:
        throw new Error(`Unsupported import type: ${type}`);
    }
  }

  static generateCSVTemplate(type: 'parties' | 'sales' | 'invoices'): string {
    const config =
      type === 'parties' ? PARTY_CSV_CONFIG :
      type === 'sales' ? SALES_CSV_CONFIG :
      INVOICE_CSV_CONFIG
    const headers = config.fieldMappings.map(mapping => mapping.csvField)
    const sampleRows = config.sampleData.map(sample => 
      headers.map(header => sample[header] || '')
    )

    return [headers, ...sampleRows]
      .map(row => row.join(','))
      .join('\n')
  }

  static downloadTemplate(type: 'parties' | 'sales' | 'invoices'): void {
    const csvContent = this.generateCSVTemplate(type)
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}_template.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }
}
